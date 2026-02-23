import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Smartphone, Volume2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Badge } from "@/components/ui/badge";

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    disable
  } = usePushNotifications();

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge className="bg-green-100 text-green-800">Activadas</Badge>;
      case 'denied':
        return <Badge variant="destructive">Bloqueadas</Badge>;
      default:
        return <Badge variant="secondary">No configuradas</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configuración de Notificaciones
        </CardTitle>
        <CardDescription>
          Gestiona cómo y cuándo quieres recibir notificaciones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado actual */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Notificaciones Push</p>
              <p className="text-sm text-muted-foreground">
                {isSupported ? 'Disponibles en tu navegador' : 'No soportadas en tu navegador'}
              </p>
            </div>
          </div>
          {getPermissionBadge()}
        </div>

        {/* Controles */}
        <div className="space-y-4">
          {/* Activar/Desactivar notificaciones */}
          {isSupported && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications" className="font-medium">
                  Notificaciones Push
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recibe notificaciones incluso cuando no estés en la app
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={isEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    requestPermission();
                  } else {
                    disable();
                  }
                }}
              />
            </div>
          )}

          {/* Información si no está soportado */}
          {!isSupported && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <BellOff className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Notificaciones no disponibles
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Tu navegador no soporta notificaciones push. Considera actualizar tu navegador
                    o usar uno más moderno como Chrome, Firefox o Safari.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información si están bloqueadas */}
          {permission === 'denied' && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <BellOff className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    Notificaciones bloqueadas
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Para activar las notificaciones, haz clic en el ícono de candado en la barra 
                    de direcciones y permite las notificaciones para este sitio.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tipos de notificaciones */}
        {isEnabled && (
          <div className="space-y-4">
            <h4 className="font-medium">Tipos de notificaciones que recibirás:</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Corazones en perfil</p>
                  <p className="text-xs text-muted-foreground">Cuando alguien te envíe un corazón</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Reacciones y comentarios</p>
                  <p className="text-xs text-muted-foreground">En tus publicaciones</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Solicitudes de amistad</p>
                  <p className="text-xs text-muted-foreground">Nuevos seguidores y amigos</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Mensajes privados</p>
                  <p className="text-xs text-muted-foreground">Cuando recibas un mensaje</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botón de test */}
        {isEnabled && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Mostrar notificación de prueba
              new Notification("¡HIDEON - Notificación de prueba!", {
                body: "Las notificaciones están funcionando correctamente",
                icon: "/favicon.ico"
              });
            }}
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Enviar notificación de prueba
          </Button>
        )}
      </CardContent>
    </Card>
  );
}