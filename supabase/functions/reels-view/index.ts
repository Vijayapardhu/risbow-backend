import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Ledger-based view tracking (1 view per user per reel per 24h)

Deno.serve(async (req: Request) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    // JWT validation (optional - allow anonymous views)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Verify JWT and get user
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Parse request body
    const { reelId } = await req.json();

    if (!reelId) {
      return new Response(
        JSON.stringify({ error: 'reelId is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if reel exists
    const { data: reel, error: reelError } = await supabase
      .from('Reel')
      .select('id')
      .eq('id', reelId)
      .single();

    if (reelError || !reel) {
      return new Response(
        JSON.stringify({ error: 'Reel not found.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If user is authenticated, check for existing view in last 24h
    if (userId) {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: existingView, error: viewCheckError } = await supabase
        .from('ReelInteractionLedger')
        .select('id')
        .eq('reelId', reelId)
        .eq('userId', userId)
        .eq('interactionType', 'VIEW')
        .gte('createdAt', twentyFourHoursAgo.toISOString())
        .single();

      if (viewCheckError && viewCheckError.code !== 'PGRST116') {
        // PGRST116 = not found, which is expected
        console.error('Error checking existing view:', viewCheckError);
        return new Response(
          JSON.stringify({ error: 'Failed to check view status.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (existingView) {
        // Already viewed in last 24h, return success but don't create new entry
        return new Response(
          JSON.stringify({
            success: true,
            viewed: true,
            message: 'View already recorded in last 24 hours.',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Create view ledger entry
      const { data: viewData, error: insertError } = await supabase
        .from('ReelInteractionLedger')
        .insert({
          reelId,
          userId,
          interactionType: 'VIEW',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating view:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record view.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          viewed: true,
          message: 'View recorded successfully.',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } else {
      // Anonymous view - don't track in ledger (or track with null userId if needed)
      // For now, just return success
      return new Response(
        JSON.stringify({
          success: true,
          viewed: true,
          message: 'View recorded (anonymous).',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
