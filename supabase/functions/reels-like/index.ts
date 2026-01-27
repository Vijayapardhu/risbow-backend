import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Ledger-based like/unlike (NO counter updates)

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

    // JWT validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Missing or invalid Authorization header.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid token.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body
    const { reelId } = await req.json();

    if (!reelId) {
      return new Response(
        JSON.stringify({ error: 'reelId is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    // Check if user already liked (via ledger)
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('ReelInteractionLedger')
      .select('id')
      .eq('reelId', reelId)
      .eq('userId', userId)
      .eq('interactionType', 'LIKE')
      .single();

    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected
      console.error('Error checking existing like:', likeCheckError);
      return new Response(
        JSON.stringify({ error: 'Failed to check like status.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingLike) {
      // Unlike: Remove ledger entry
      const { error: deleteError } = await supabase
        .from('ReelInteractionLedger')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to unlike reel.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          liked: false,
          message: 'Reel unliked successfully.',
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
      // Like: Create ledger entry
      const { data: likeData, error: insertError } = await supabase
        .from('ReelInteractionLedger')
        .insert({
          reelId,
          userId,
          interactionType: 'LIKE',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating like:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to like reel.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          liked: true,
          message: 'Reel liked successfully.',
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
