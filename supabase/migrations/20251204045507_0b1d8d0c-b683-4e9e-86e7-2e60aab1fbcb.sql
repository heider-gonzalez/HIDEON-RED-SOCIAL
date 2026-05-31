-- Create idea_requests table for the request/approval system (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE public.idea_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          profession TEXT,
          message TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(post_id, user_id)
        );

        -- Enable RLS
        ALTER TABLE public.idea_requests ENABLE ROW LEVEL SECURITY;

        -- Users can create requests
        CREATE POLICY "Users can create idea requests" ON public.idea_requests
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Users can view their own requests
        CREATE POLICY "Users can view their requests" ON public.idea_requests
          FOR SELECT USING (auth.uid() = user_id);

        -- Idea owners can view requests for their ideas
        CREATE POLICY "Idea owners can view requests" ON public.idea_requests
          FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
          );

        -- Idea owners can update request status
        CREATE POLICY "Idea owners can update requests" ON public.idea_requests
          FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
          );

        -- Users can delete their pending requests
        CREATE POLICY "Users can delete pending requests" ON public.idea_requests
          FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

        -- Create trigger for updated_at
        CREATE TRIGGER update_idea_requests_updated_at
          BEFORE UPDATE ON public.idea_requests
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;