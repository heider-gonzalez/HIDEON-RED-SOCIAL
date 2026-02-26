import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function DebugPremium() {
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    checkUser();
  }, []);

  const activatePremium = async () => {
    toast({
      title: "Funcionalidad deshabilitada",
      description: "El sistema Premium/Suscripciones fue descartado y ya no está disponible."
    });
  };

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug - Estado Premium</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>User ID:</strong> {userId || "Cargando..."}
          </div>
          
          <div>
            <strong>Estado Premium:</strong> Deshabilitado
          </div>
          
          <div>
            <strong>Suscripción:</strong> No aplica
          </div>
          
          {userId && (
            <Button onClick={activatePremium} className="mt-4">
              Premium no disponible
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
