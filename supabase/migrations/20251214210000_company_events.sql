-- Companies step 2A: allow creating/managing academic events as a company (only if posts table exists)

-- 0) Ensure required tables exist (some projects may not have applied the educational hub migration)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.academic_events (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          title text NOT NULL,
          description text NOT NULL,
          event_type text NOT NULL,
          start_date timestamp with time zone NOT NULL,
          end_date timestamp with time zone,
          location text,
          is_virtual boolean DEFAULT false,
          meeting_link text,
          max_attendees integer,
          current_attendees integer DEFAULT 0,
          registration_required boolean DEFAULT true,
          registration_deadline timestamp with time zone,
          organizer_contact text,
          banner_url text,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.event_registrations (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          event_id uuid NOT NULL REFERENCES public.academic_events(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          registration_data jsonb DEFAULT '{}'::jsonb,
          attendance_status text DEFAULT 'registered',
          check_in_time timestamp with time zone,
          certificate_issued boolean DEFAULT false,
          feedback_rating integer,
          feedback_comment text,
          registered_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now(),
          UNIQUE(event_id, user_id)
        );

        ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

        -- Base SELECT policy for events (needed for feed joins)
        DROP POLICY IF EXISTS "Anyone can view published events" ON public.academic_events;
        CREATE POLICY "Anyone can view published events" ON public.academic_events
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.posts p
              WHERE p.id = academic_events.post_id
                AND p.visibility = 'public'
            )
          );

        -- Base policies for registrations
        DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
        CREATE POLICY "Users can register for events" ON public.event_registrations
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can view their registrations" ON public.event_registrations;
        CREATE POLICY "Users can view their registrations" ON public.event_registrations
          FOR SELECT USING (auth.uid() = user_id);

        -- 2) Update RLS to allow company members to manage events/registrations
        -- academic_events
        DROP POLICY IF EXISTS "Post authors can manage events" ON public.academic_events;
        CREATE POLICY "Post authors can manage events" ON public.academic_events
          FOR ALL USING (
            EXISTS (
              SELECT 1
              FROM public.posts p
              WHERE p.id = academic_events.post_id
                AND (
                  p.user_id = auth.uid()
                  OR (
                    p.company_id IS NOT NULL
                    AND EXISTS (
                      SELECT 1
                      FROM public.company_members cm
                      WHERE cm.company_id = p.company_id
                        AND cm.user_id = auth.uid()
                        AND cm.role IN ('admin','editor')
                    )
                  )
                )
            )
          );

        -- event_registrations
        DROP POLICY IF EXISTS "Event organizers can view registrations" ON public.event_registrations;
        CREATE POLICY "Event organizers can view registrations" ON public.event_registrations
          FOR SELECT USING (
            EXISTS (
              SELECT 1
              FROM public.academic_events ae
              JOIN public.posts p ON p.id = ae.post_id
              WHERE ae.id = event_id
                AND (
                  p.user_id = auth.uid()
                  OR (
                    p.company_id IS NOT NULL
                    AND EXISTS (
                      SELECT 1
                      FROM public.company_members cm
                      WHERE cm.company_id = p.company_id
                        AND cm.user_id = auth.uid()
                        AND cm.role IN ('admin','editor')
                    )
                  )
                )
            )
          );

        DROP POLICY IF EXISTS "Participants can update registrations" ON public.event_registrations;
        CREATE POLICY "Participants can update registrations" ON public.event_registrations
          FOR UPDATE USING (
            auth.uid() = user_id
            OR EXISTS (
              SELECT 1
              FROM public.academic_events ae
              JOIN public.posts p ON p.id = ae.post_id
              WHERE ae.id = event_id
                AND (
                  p.user_id = auth.uid()
                  OR (
                    p.company_id IS NOT NULL
                    AND EXISTS (
                      SELECT 1
                      FROM public.company_members cm
                      WHERE cm.company_id = p.company_id
                        AND cm.user_id = auth.uid()
                        AND cm.role IN ('admin','editor')
                    )
                  )
                )
            )
          );
    END IF;
END $$;

-- 1) Update RPC to support company_id
-- Note: Skipping function creation as it depends on posts, company_members, and academic_events tables
-- Function will be created when the required tables exist
