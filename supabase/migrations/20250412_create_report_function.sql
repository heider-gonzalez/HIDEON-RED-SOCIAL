
-- Create a function to handle the creation of comment reports
CREATE OR REPLACE FUNCTION public.create_comment_report(
  p_comment_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.comment_reports (
    comment_id,
    user_id,
    reason
  ) VALUES (
    p_comment_id,
    auth.uid(),
    p_reason
  );
END;
$$;
