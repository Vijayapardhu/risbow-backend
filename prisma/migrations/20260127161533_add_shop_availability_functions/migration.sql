-- Shop availability functions and triggers (DB-level enforcement)
-- Safe/idempotent - can be run multiple times

-- ============================================
-- FUNCTION: is_shop_open(vendor_id, check_time)
-- ============================================
CREATE OR REPLACE FUNCTION is_shop_open(vendor_id TEXT, check_time TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
  v_vendor RECORD;
  v_day_key TEXT;
  v_current_time TEXT;
  v_timings JSONB;
  v_day_name TEXT;
  v_weekday INT;
  v_range RECORD;
  v_is_open BOOLEAN := FALSE;
BEGIN
  -- Get vendor details
  SELECT "storeStatus", "storeClosedUntil", "storeTimings" INTO v_vendor
  FROM "Vendor" WHERE id = vendor_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if vendor is ACTIVE
  IF v_vendor."storeStatus" IS NULL OR v_vendor."storeStatus" != 'ACTIVE' THEN
    RETURN FALSE;
  END IF;
  
  -- Check temporary closure
  IF v_vendor."storeClosedUntil" IS NOT NULL AND check_time < v_vendor."storeClosedUntil" THEN
    RETURN FALSE;
  END IF;
  
  -- Check timings (if defined)
  v_timings := v_vendor."storeTimings";
  IF v_timings IS NULL OR v_timings = 'null'::jsonb THEN
    RETURN TRUE; -- 24/7 if no timings defined
  END IF;
  
  -- Get current day and time
  v_weekday := EXTRACT(DOW FROM check_time); -- 0=Sunday, 6=Saturday
  v_day_name := LOWER(TO_CHAR(check_time, 'Day')); -- 'monday  ', 'tuesday ', etc. (padded)
  v_day_name := TRIM(v_day_name); -- Remove padding
  v_current_time := TO_CHAR(check_time, 'HH24:MI');
  
  -- Parse weekly schedule (format: { weekly: { mon: [{ start: '09:00', end: '21:00' }], ... } })
  IF v_timings ? 'weekly' AND jsonb_typeof(v_timings->'weekly') = 'object' THEN
    -- Try lowercase day name first
    IF v_timings->'weekly' ? v_day_name THEN
      FOR v_range IN 
        SELECT * FROM jsonb_array_elements(v_timings->'weekly'->v_day_name)
      LOOP
        IF (v_range.value->>'start')::TIME <= v_current_time::TIME 
           AND v_current_time::TIME <= (v_range.value->>'end')::TIME THEN
          v_is_open := TRUE;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    
    -- Try uppercase day name
    IF NOT v_is_open THEN
      IF v_timings->'weekly' ? UPPER(v_day_name) THEN
        FOR v_range IN 
          SELECT * FROM jsonb_array_elements(v_timings->'weekly'->UPPER(v_day_name))
        LOOP
          IF (v_range.value->>'start')::TIME <= v_current_time::TIME 
             AND v_current_time::TIME <= (v_range.value->>'end')::TIME THEN
            v_is_open := TRUE;
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END IF;
    
    -- If no ranges found for the day, shop is closed
    RETURN v_is_open;
  END IF;
  
  -- Parse simple daily window (format: { open: '09:00', close: '21:00' })
  IF v_timings ? 'open' AND v_timings ? 'close' THEN
    IF (v_timings->>'open')::TIME <= v_current_time::TIME 
       AND v_current_time::TIME <= (v_timings->>'close')::TIME THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- If timings structure is unknown, assume open (safe default)
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: enforce_shop_open_on_order()
-- ============================================
CREATE OR REPLACE FUNCTION enforce_shop_open_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id TEXT;
  v_is_open BOOLEAN;
  v_items JSONB;
  v_item RECORD;
BEGIN
  -- Extract vendor IDs from order items JSON
  -- Order items format: [{"productId": "...", "vendorId": "...", ...}, ...]
  v_items := NEW.items;
  
  IF v_items IS NULL OR jsonb_typeof(v_items) != 'array' THEN
    -- If items structure is invalid, allow order (will fail validation elsewhere)
    RETURN NEW;
  END IF;
  
  -- Check each item's vendor
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_vendor_id := v_item.value->>'vendorId';
    
    IF v_vendor_id IS NOT NULL THEN
      v_is_open := is_shop_open(v_vendor_id, NOW());
      
      IF NOT v_is_open THEN
        RAISE EXCEPTION 'Cannot place order: Shop with vendor ID % is closed', v_vendor_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: check_shop_open_before_order
-- ============================================
DROP TRIGGER IF EXISTS check_shop_open_before_order ON "Order";

CREATE TRIGGER check_shop_open_before_order
BEFORE INSERT ON "Order"
FOR EACH ROW
EXECUTE FUNCTION enforce_shop_open_on_order();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION is_shop_open(TEXT, TIMESTAMPTZ) IS 'Checks if a vendor shop is open at the given time. Returns TRUE if open, FALSE if closed. Handles storeStatus, temporary closures, and weekly/daily timings.';
COMMENT ON FUNCTION enforce_shop_open_on_order() IS 'Trigger function that enforces shop availability before order creation. Rejects orders if any vendor in the order items is closed.';
