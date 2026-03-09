import { Loader2, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileLayoutProps {
  isLoading?: boolean;
  error?: boolean;
  children?: React.ReactNode;
}

export function ProfileLayout({ isLoading, error, children }: ProfileLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Card className={`w-full max-w-md p-6 ${isMobile ? 'mx-2' : 'mx-4'}`}>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <UserX className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold">Perfil no encontrado</h2>
            <p className="text-muted-foreground">
              Lo sentimos, el perfil que buscas no existe o no está disponible.
            </p>
            <Button onClick={() => navigate("/")} variant="default" className="w-full">
              Volver al inicio
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>{children}</>
  );
}
