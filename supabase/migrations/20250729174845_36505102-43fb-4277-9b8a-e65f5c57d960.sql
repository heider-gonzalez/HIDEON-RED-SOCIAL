-- Update hearts limit function to give 20 hearts to premium users instead of 5
CREATE OR REPLACE FUNCTION public.get_hearts_limit(user_id_param uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT CASE 
    WHEN public.is_premium_user(user_id_param) THEN 20
    ELSE 1
  END;
$function$