-- Message Notifications Trigger
-- Creates automatic notifications for new chat messages

-- Function to create notification for message recipients
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
DECLARE
    channel_members RECORD;
    channel_type BOOLEAN;
BEGIN
    -- Get channel type to determine notification strategy
    SELECT es_privado INTO channel_type
    FROM public.canales 
    WHERE id = NEW.id_canal;

    -- For private channels, notify all members except the sender
    IF channel_type = true THEN -- Private channel
        FOR channel_members IN 
            SELECT id_usuario 
            FROM public.miembros_canal 
            WHERE id_canal = NEW.id_canal 
            AND id_usuario != NEW.id_autor
        LOOP
            INSERT INTO public.notifications (
                receiver_id,
                sender_id,
                type,
                message,
                read
            ) VALUES (
                channel_members.id_usuario,
                NEW.id_autor,
                'message',
                'Te han enviado un nuevo mensaje',
                false
            );
        END LOOP;
    ELSE -- Public channel
        -- For public channels, we could notify followers or interested users
        -- For now, create a system notification for new messages in public channels
        INSERT INTO public.notifications (
            receiver_id,
            sender_id,
            type,
            message,
            read
        ) VALUES (
            NEW.id_autor, -- Self-notification for public messages
            NEW.id_autor,
            'message',
            'Mensaje enviado al canal público',
            false
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS on_message_insert_notification ON public.mensajes;
CREATE TRIGGER on_message_insert_notification
AFTER INSERT ON public.mensajes
FOR EACH ROW
EXECUTE FUNCTION public.create_message_notification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_message_notification() TO authenticated;
