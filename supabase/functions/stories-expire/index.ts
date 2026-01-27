import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Cron job to delete expired stories
// Should be scheduled to run every hour

Deno.serve(async (req: Request) => {
  try {
    // Verify cron secret (if configured)
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (cronSecret && providedSecret !== cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find expired stories
    const { data: expiredStories, error: fetchError } = await supabase
      .from('Story')
      .select('id, mediaUrl')
      .or(`expiresAt.lt.${now},isActive.eq.false`)
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Error fetching expired stories:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired stories.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredStories || expiredStories.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired stories found.',
          deleted: 0 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete files from storage
    const filePaths = expiredStories
      .map(story => {
        // Extract path from URL
        const url = new URL(story.mediaUrl);
        return url.pathname.replace('/storage/v1/object/public/videos/', '');
      })
      .filter(path => path);

    if (filePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('videos')
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting files from storage:', deleteError);
        // Continue with DB deletion even if file deletion fails
      }
    }

    // Delete story records
    const storyIds = expiredStories.map(s => s.id);
    const { error: deleteError } = await supabase
      .from('Story')
      .delete()
      .in('id', storyIds);

    if (deleteError) {
      console.error('Error deleting story records:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete story records.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${expiredStories.length} expired stories.`,
        deleted: expiredStories.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
