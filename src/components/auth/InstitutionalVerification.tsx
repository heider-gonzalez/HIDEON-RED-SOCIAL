import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Mail, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { institutionsBarranquilla, validateEmailDomain } from "@/data/institutions-barranquilla";
import { useToast } from "@/hooks/use-toast";

type Step = "email" | "code" | "success";

interface InstitutionalVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId?: string;
  onVerified?: () => void;
}

export function InstitutionalVerification({
  open,
  onOpenChange,
  institutionId: propInstitutionId,
  onVerified,
}: InstitutionalVerificationProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(propInstitutionId || "");

  const institution = institutionsBarranquilla.find((i) => i.id === selectedInstitutionId);

  const resetState = useCallback(() => {
    setStep("email");
    setEmail("");
    setCode("");
    setError(null);
    setLoading(false);
  }, []);

  const handleOpenChange = (value: boolean) => {
    if (!value) resetState();
    onOpenChange(value);
  };

  const handleRequestCode = async () => {
    if (!user) return;
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Ingresa un correo electrónico válido");
      return;
    }

    if (!selectedInstitutionId || selectedInstitutionId === "otros") {
      setError("Selecciona una institución válida");
      return;
    }

    if (!validateEmailDomain(trimmedEmail, selectedInstitutionId)) {
      setError(
        `El correo debe ser del dominio ${institution?.emailDomain || "institucional"}. Ejemplo: tu.nombre${institution?.emailDomain || "@universidad.edu.co"}`
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc(
        "request_university_verification",
        {
          p_institutional_email: trimmedEmail,
          p_institution_id: selectedInstitutionId,
        }
      );

      if (rpcError) throw rpcError;

      const result = typeof data === "string" ? JSON.parse(data) : data;

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (import.meta.env.DEV && result.code) {
        console.log("[DEV] Código de verificación:", result.code);
      }

      setStep("code");
      toast({
        title: "Código enviado",
        description: `Revisa tu bandeja de entrada en ${trimmedEmail}`,
      });
    } catch (err: any) {
      setError(err?.message || "Error al solicitar verificación");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!user) return;
    setError(null);

    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc(
        "verify_university_code",
        { p_code: code }
      );

      if (rpcError) throw rpcError;

      const result = typeof data === "string" ? JSON.parse(data) : data;

      if (!result.success) {
        setError(result.error);
        return;
      }

      setStep("success");
      toast({
        title: "Verificación exitosa",
        description: "Tu perfil ahora muestra el badge de estudiante verificado",
      });
      onVerified?.();
    } catch (err: any) {
      setError(err?.message || "Error al verificar código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {step === "success" ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <Shield className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">
            {step === "success" ? "Verificación Completada" : "Verificación Universitaria"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "email" && "Ingresa tu correo institucional para verificar tu perfil"}
            {step === "code" && "Ingresa el código de 6 dígitos enviado a tu correo"}
            {step === "success" && "Tu cuenta ha sido verificada exitosamente"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "email" && (
            <>
              {!propInstitutionId && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Institución</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedInstitutionId}
                    onChange={(e) => {
                      setSelectedInstitutionId(e.target.value);
                      setError(null);
                    }}
                  >
                    <option value="">Selecciona tu institución</option>
                    {institutionsBarranquilla
                      .filter((i) => i.id !== "otros" && i.emailDomain)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium">Correo institucional</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={institution?.emailDomain ? `tu.nombre${institution.emailDomain}` : "correo@universidad.edu.co"}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                {institution?.emailDomain && (
                  <p className="text-xs text-muted-foreground">
                    Solo se aceptan correos con dominio {institution.emailDomain}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleRequestCode}
                disabled={loading || !email.trim() || !selectedInstitutionId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar código de verificación"
                )}
              </Button>
            </>
          )}

          {step === "code" && (
            <>
              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setError(null);
                  }}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <p className="text-xs text-muted-foreground text-center">
                  El código expira en 15 minutos. Máximo 5 intentos.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Volver
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar"
                  )}
                </Button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-full">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Estudiante Verificado — {institution?.name}
                </span>
              </div>
              <Button className="w-full" onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
