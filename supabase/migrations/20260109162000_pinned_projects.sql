--- Tabla para proyectos fijados por usuarios Premium (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.pinned_projects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          project_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          position integer NOT NULL CHECK (position >= 0 AND position <= 2), -- 0,1,2 (máx 3 fijados)
          created_at timestamptz DEFAULT now() NOT NULL,
          UNIQUE(user_id, position),
          UNIQUE(user_id, project_id)
        );

        --- Índices útiles
        CREATE INDEX IF NOT EXISTS idx_pinned_projects_user_id ON public.pinned_projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_pinned_projects_project_id ON public.pinned_projects(project_id);
        CREATE INDEX IF NOT EXISTS idx_pinned_projects_position ON public.pinned_projects(user_id, position);

        --- RLS: solo el dueño puede leer/insertar/actualizar/eliminar
        ALTER TABLE public.pinned_projects ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage own pinned projects" ON public.pinned_projects
          FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

--- Vista para obtener proyectos fijados de un usuario con datos del proyecto
--- Note: Skipping view and function creation as they depend on posts, project_showcases, and other tables
--- These will be created when the required tables exist 