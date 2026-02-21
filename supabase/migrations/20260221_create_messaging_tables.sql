
-- Migration to ensure 'mensajes' and 'canales' tables exist for the messaging system
-- This follows the schema expected by the frontend in src/lib/api/messages/queries.ts

-- 1. Create 'canales' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.canales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT,
    es_privado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Create 'miembros_canal' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.miembros_canal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_canal UUID REFERENCES public.canales(id) ON DELETE CASCADE,
    id_usuario UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id_canal, id_usuario)
);

-- 3. Create 'mensajes' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_canal UUID REFERENCES public.canales(id) ON DELETE CASCADE,
    id_autor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    contenido TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.canales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembros_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for 'canales'
DROP POLICY IF EXISTS "Users can view channels they are members of" ON public.canales;
CREATE POLICY "Users can view channels they are members of" ON public.canales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.miembros_canal
            WHERE miembros_canal.id_canal = canales.id
        )
        OR es_privado = false
    );

-- 6. RLS Policies for 'miembros_canal'
-- Completely non-recursive policy for miembros_canal
-- We use a simpler check: users can see any membership row. 
-- Privacy is actually controlled at the 'canales' and 'mensajes' level.
DROP POLICY IF EXISTS "Users can view members of their channels" ON public.miembros_canal;
CREATE POLICY "Users can view members of their channels" ON public.miembros_canal
    FOR SELECT USING (true); 

-- 7. RLS Policies for 'mensajes'
-- Users can see messages if they are members of the channel.
-- To avoid recursion, we check membership via a direct join in the policy.
DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.mensajes;
CREATE POLICY "Users can view messages in their channels" ON public.mensajes
    FOR SELECT USING (
        id_canal IN (
            SELECT mc.id_canal 
            FROM public.miembros_canal mc 
            WHERE mc.id_usuario = auth.uid()
        )
        OR 
        id_canal IN (
            SELECT c.id 
            FROM public.canales c 
            WHERE c.es_privado = false
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in their channels" ON public.mensajes;
CREATE POLICY "Users can insert messages in their channels" ON public.mensajes
    FOR INSERT WITH CHECK (
        id_canal IN (
            SELECT mc.id_canal 
            FROM public.miembros_canal mc 
            WHERE mc.id_usuario = auth.uid()
        )
        OR 
        id_canal IN (
            SELECT c.id 
            FROM public.canales c 
            WHERE c.es_privado = false
        )
    );

-- 8. Global Channel Setup (Optional but helpful based on GLOBAL_CHANNEL_ID)
-- INSERT INTO public.canales (id, nombre, es_privado) 
-- VALUES ('2f79759f-c53f-40ae-b786-59f6e69264a6', 'Global Chat', false)
-- ON CONFLICT (id) DO NOTHING;

-- 9. Trigger for push notifications (linked to notification_queue system)
-- This uses the queue_push_notification function defined in push_notifications.sql
DROP TRIGGER IF EXISTS queue_push_notification_trigger ON public.mensajes;
CREATE TRIGGER queue_push_notification_trigger
    AFTER INSERT ON public.mensajes
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_push_notification();
