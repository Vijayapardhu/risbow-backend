import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// State machine transitions for delivery discipline
// Processes missed deliveries and successful deliveries

Deno.serve(async (req: Request) => {
  try {
    // Verify cron secret or service role
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

    // Parse request body
    const { vendorId, orderId, eventType } = await req.json();

    if (!vendorId || !orderId || !eventType) {
      return new Response(
        JSON.stringify({ error: 'vendorId, orderId, and eventType are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['MISSED_DELIVERY', 'SUCCESSFUL_DELIVERY'].includes(eventType)) {
      return new Response(
        JSON.stringify({ error: 'eventType must be MISSED_DELIVERY or SUCCESSFUL_DELIVERY.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (eventType === 'MISSED_DELIVERY') {
      // On missed delivery:
      // 1. Create VendorDisciplineEvent (STRIKE_ADDED)
      const { error: eventError } = await supabase
        .from('VendorDisciplineEvent')
        .insert({
          vendorId,
          orderId,
          eventType: 'STRIKE_ADDED',
          reason: 'Missed delivery',
          performedBy: null, // Auto
        });

      if (eventError) {
        console.error('Error creating discipline event:', eventError);
        return new Response(
          JSON.stringify({ error: 'Failed to create discipline event.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 2. Recalculate VendorDisciplineState.activeStrikes
      // Count STRIKE_ADDED events minus STRIKE_REMOVED events
      const { data: strikeAdded, error: addedError } = await supabase
        .from('VendorDisciplineEvent')
        .select('id', { count: 'exact', head: true })
        .eq('vendorId', vendorId)
        .eq('eventType', 'STRIKE_ADDED');

      const { data: strikeRemoved, error: removedError } = await supabase
        .from('VendorDisciplineEvent')
        .select('id', { count: 'exact', head: true })
        .eq('vendorId', vendorId)
        .eq('eventType', 'STRIKE_REMOVED');

      if (addedError || removedError) {
        console.error('Error counting strikes:', addedError || removedError);
        return new Response(
          JSON.stringify({ error: 'Failed to count strikes.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const activeStrikes = (strikeAdded?.length || 0) - (strikeRemoved?.length || 0);

      // 3. Update or create VendorDisciplineState
      const { data: existingState } = await supabase
        .from('VendorDisciplineState')
        .select('state')
        .eq('vendorId', vendorId)
        .single();

      let newState = 'ACTIVE';
      if (activeStrikes >= 3) {
        newState = 'BLOCKED';
        // Create AUTO_BLOCKED event
        await supabase
          .from('VendorDisciplineEvent')
          .insert({
            vendorId,
            orderId,
            eventType: 'AUTO_BLOCKED',
            reason: `Auto-blocked due to ${activeStrikes} active strikes`,
            performedBy: null,
          });
      } else if (activeStrikes >= 2) {
        newState = 'WARNING';
      }

      const { error: stateError } = await supabase
        .from('VendorDisciplineState')
        .upsert({
          vendorId,
          state: newState,
          activeStrikes,
          lastStateChange: new Date().toISOString(),
        }, {
          onConflict: 'vendorId',
        });

      if (stateError) {
        console.error('Error updating discipline state:', stateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update discipline state.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Strike added and state updated.',
          activeStrikes,
          state: newState,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (eventType === 'SUCCESSFUL_DELIVERY') {
      // On successful delivery:
      // 1. Get current state
      const { data: currentState, error: stateError } = await supabase
        .from('VendorDisciplineState')
        .select('*')
        .eq('vendorId', vendorId)
        .single();

      if (stateError && stateError.code !== 'PGRST116') {
        // PGRST116 = not found
        console.error('Error fetching discipline state:', stateError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch discipline state.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const consecutiveSuccesses = (currentState?.consecutiveSuccesses || 0) + 1;

      // 2. If consecutiveSuccesses >= 10, remove strikes
      if (consecutiveSuccesses >= 10) {
        // Count active strikes
        const { data: strikeAdded } = await supabase
          .from('VendorDisciplineEvent')
          .select('id', { count: 'exact', head: true })
          .eq('vendorId', vendorId)
          .eq('eventType', 'STRIKE_ADDED');

        const { data: strikeRemoved } = await supabase
          .from('VendorDisciplineEvent')
          .select('id', { count: 'exact', head: true })
          .eq('vendorId', vendorId)
          .eq('eventType', 'STRIKE_REMOVED');

        const activeStrikes = (strikeAdded?.length || 0) - (strikeRemoved?.length || 0);

        // Create STRIKE_REMOVED events for all active strikes
        if (activeStrikes > 0) {
          for (let i = 0; i < activeStrikes; i++) {
            await supabase
              .from('VendorDisciplineEvent')
              .insert({
                vendorId,
                orderId,
                eventType: 'STRIKE_REMOVED',
                reason: `Strike removed after ${consecutiveSuccesses} consecutive successful deliveries`,
                performedBy: null,
              });
          }
        }

        // Update state to ACTIVE
        const { error: updateError } = await supabase
          .from('VendorDisciplineState')
          .upsert({
            vendorId,
            state: 'ACTIVE',
            activeStrikes: 0,
            consecutiveSuccesses: 0, // Reset counter
            lastStateChange: new Date().toISOString(),
          }, {
            onConflict: 'vendorId',
          });

        if (updateError) {
          console.error('Error updating discipline state:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update discipline state.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Strikes removed after 10 consecutive successes.',
            activeStrikes: 0,
            state: 'ACTIVE',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Just increment consecutiveSuccesses
        const { error: updateError } = await supabase
          .from('VendorDisciplineState')
          .upsert({
            vendorId,
            state: currentState?.state || 'ACTIVE',
            activeStrikes: currentState?.activeStrikes || 0,
            consecutiveSuccesses,
            lastStateChange: currentState?.lastStateChange || new Date().toISOString(),
          }, {
            onConflict: 'vendorId',
          });

        if (updateError) {
          console.error('Error updating discipline state:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update discipline state.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Consecutive successes incremented.',
            consecutiveSuccesses,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
