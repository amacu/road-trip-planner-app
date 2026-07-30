CREATE OR REPLACE FUNCTION public.touch_trip_day_for_realtime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_day_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'trip_stays' THEN
    affected_day_id := COALESCE(NEW.after_day_id, OLD.after_day_id);
  ELSE
    affected_day_id := COALESCE(NEW.trip_day_id, OLD.trip_day_id);
  END IF;

  UPDATE public.trip_days
  SET updated_at = now()
  WHERE id = affected_day_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trip_stops_touch_day_realtime
AFTER INSERT OR UPDATE OR DELETE ON public.trip_stops
FOR EACH ROW EXECUTE FUNCTION public.touch_trip_day_for_realtime();

CREATE TRIGGER trip_stays_touch_day_realtime
AFTER INSERT OR UPDATE OR DELETE ON public.trip_stays
FOR EACH ROW EXECUTE FUNCTION public.touch_trip_day_for_realtime();

CREATE TRIGGER trip_activities_touch_day_realtime
AFTER INSERT OR UPDATE OR DELETE ON public.trip_activities
FOR EACH ROW EXECUTE FUNCTION public.touch_trip_day_for_realtime();
