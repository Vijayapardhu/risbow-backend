import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Calls PostgreSQL function is_shop_open(vendor_id, NOW())

Deno.serve(async (req: Request) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get vendor ID from query params
    const url = new URL(req.url);
    const vendorId = url.searchParams.get('vendorId');

    if (!vendorId) {
      return new Response(
        JSON.stringify({ error: 'vendorId query parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call PostgreSQL function: is_shop_open(vendor_id, NOW())
    const { data, error } = await supabase.rpc('is_shop_open', {
      vendor_id: vendorId,
      check_time: new Date().toISOString(),
    });

    if (error) {
      console.error('Error calling is_shop_open function:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check shop availability.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isOpen = data === true;

    // Get vendor details for nextOpenAt if closed
    let nextOpenAt: string | null = null;
    if (!isOpen) {
      const { data: vendor, error: vendorError } = await supabase
        .from('Vendor')
        .select('storeClosedUntil, storeTimings')
        .eq('id', vendorId)
        .single();

      if (!vendorError && vendor) {
        if (vendor.storeClosedUntil) {
          nextOpenAt = vendor.storeClosedUntil;
        } else if (vendor.storeTimings) {
          // Calculate next open time from storeTimings
          // This is a simplified version - full implementation would parse timings
          // For now, return null and let the client handle it
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isOpen,
        nextOpenAt,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
