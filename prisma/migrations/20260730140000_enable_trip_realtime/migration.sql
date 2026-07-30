CREATE OR REPLACE FUNCTION public.can_access_trip_realtime(target_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips AS trip
    WHERE trip.id = target_trip_id
      AND (
        trip.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.trip_members AS member
          WHERE member.trip_id = trip.id
            AND member.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_trip_realtime(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_trip_realtime(uuid) TO authenticated;

ALTER TABLE public.trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can receive realtime day changes"
ON public.trip_days FOR SELECT TO authenticated
USING (public.can_access_trip_realtime(trip_id));

CREATE POLICY "Trip members can receive realtime stop changes"
ON public.trip_stops FOR SELECT TO authenticated
USING (public.can_access_trip_realtime(trip_id));

CREATE POLICY "Trip members can receive realtime stay changes"
ON public.trip_stays FOR SELECT TO authenticated
USING (public.can_access_trip_realtime(trip_id));

CREATE POLICY "Trip members can receive realtime activity changes"
ON public.trip_activities FOR SELECT TO authenticated
USING (public.can_access_trip_realtime(trip_id));

GRANT SELECT ON public.trip_days TO authenticated;
GRANT SELECT ON public.trip_stops TO authenticated;
GRANT SELECT ON public.trip_stays TO authenticated;
GRANT SELECT ON public.trip_activities TO authenticated;

ALTER TABLE public.trip_days REPLICA IDENTITY FULL;
ALTER TABLE public.trip_stops REPLICA IDENTITY FULL;
ALTER TABLE public.trip_stays REPLICA IDENTITY FULL;
ALTER TABLE public.trip_activities REPLICA IDENTITY FULL;

DO $$
DECLARE
  realtime_table text;
BEGIN
  FOREACH realtime_table IN ARRAY ARRAY[
    'trip_days',
    'trip_stops',
    'trip_stays',
    'trip_activities'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = realtime_table
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        realtime_table
      );
    END IF;
  END LOOP;
END
$$;
