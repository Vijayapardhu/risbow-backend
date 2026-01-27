import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Cron job to deactivate expired clearance products
// Should be scheduled to run daily

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

    // Find expired clearance products
    const { data: expiredProducts, error: fetchError } = await supabase
      .from('ClearanceProduct')
      .select('id')
      .eq('isActive', true)
      .lt('expiryDate', now)
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Error fetching expired clearance products:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired clearance products.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredProducts || expiredProducts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired clearance products found.',
          deactivated: 0 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deactivate expired products
    const productIds = expiredProducts.map(p => p.id);
    const { error: updateError } = await supabase
      .from('ClearanceProduct')
      .update({ isActive: false })
      .in('id', productIds);

    if (updateError) {
      console.error('Error deactivating clearance products:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deactivate clearance products.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deactivated ${expiredProducts.length} expired clearance products.`,
        deactivated: expiredProducts.length,
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
