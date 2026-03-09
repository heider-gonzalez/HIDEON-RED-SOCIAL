import { NotificationSettings as NotificationSettingsComponent } from "@/components/notifications/NotificationSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotificationSettings() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Configuración de Notificaciones</h1>
      </div>
      
      <NotificationSettingsComponent />
    </div>
  );
}