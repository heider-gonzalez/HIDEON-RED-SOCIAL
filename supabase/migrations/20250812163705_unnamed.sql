-- Secure nequi_payments: only service_role can write; only owner can read
-- 1) Drop overly permissive system policy
DROP POLICY IF EXISTS "System can manage payments" ON public.nequi_payments;

-- 2) Recreate a strict system policy scoped to service_role only
CREATE POLICY "System can manage payments"
ON public.nequi_payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3) Ensure user read access is only for authenticated owners
DROP POLICY IF EXISTS "Users can view their own payments" ON public.nequi_payments;
CREATE POLICY "Users can view their own payments"
ON public.nequi_payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
