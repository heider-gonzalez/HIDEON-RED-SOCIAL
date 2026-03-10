-- Agregar columna is_deleted a la tabla messages
ALTER TABLE public.messages 
ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- Agregar columna is_deleted a la tabla group_messages
ALTER TABLE public.group_messages 
ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- Agregar política para UPDATE en messages
CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

-- Agregar política para UPDATE en group_messages  
CREATE POLICY "Users can update their own group messages" 
ON public.group_messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

-- Agregar política para DELETE en group_messages
CREATE POLICY "Users can delete their own group messages" 
ON public.group_messages 
FOR DELETE 
USING (auth.uid() = sender_id);