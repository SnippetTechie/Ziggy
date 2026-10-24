CREATE FUNCTION ziggy_prevent_stock_movement_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'stock_movements rows are immutable; record a compensating movement instead' USING ERRCODE = '23001';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ziggy_stock_movements_immutable
BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION ziggy_prevent_stock_movement_change();
