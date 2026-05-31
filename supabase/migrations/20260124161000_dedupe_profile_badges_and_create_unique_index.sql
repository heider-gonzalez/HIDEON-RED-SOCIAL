-- Dedupe profile badges and create unique index (only if profile_badges table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_badges') THEN
        -- Step 1: Archive duplicates for safety (optional, but recommended)
        CREATE TABLE IF NOT EXISTS public.profile_badges_duplicates AS
        SELECT * FROM public.profile_badges WHERE false;

        -- Insert duplicates into archive table
        WITH duplicates AS (
          SELECT *
          FROM (
            SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY profile_id, badge_type
                ORDER BY created_at ASC NULLS LAST, id ASC
              ) AS rn
            FROM public.profile_badges
          ) t
          WHERE rn > 1
        )
        INSERT INTO public.profile_badges_duplicates
        SELECT * FROM duplicates;

        -- Step 2: Delete duplicates, keeping the earliest created_at (or lowest id if null)
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY profile_id, badge_type
              ORDER BY created_at ASC NULLS LAST, id ASC
            ) AS rn
          FROM public.profile_badges
        )
        DELETE FROM public.profile_badges pb
        USING ranked r
        WHERE pb.id = r.id
          AND r.rn > 1;

        -- Step 3: Create the unique index (now safe)
        CREATE UNIQUE INDEX IF NOT EXISTS profile_badges_profile_id_badge_type_key
        ON public.profile_badges (profile_id, badge_type);
    END IF;
END $$;
