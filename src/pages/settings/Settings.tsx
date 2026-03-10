import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Lock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Settings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const settingsCategories = [
    {
      title: "Datos personales",
      description: "Gestiona tu información personal",
      icon: User,
      path: "/settings/account",
      color: "text-blue-600",
    },
    {
      title: "Contraseña y seguridad",
      description: "Cambia tu contraseña y revisa tu inicio de sesión",
      icon: Lock,
      path: "/settings/security",
      color: "text-orange-600",
    },
  ];

  return (
    <FullScreenPageLayout title="Configuración de la cuenta">
      <div className={`w-full ${isMobile ? "px-2 py-3" : "container max-w-2xl mx-auto px-4 py-6"}`}>
        <div className={isMobile ? "space-y-3" : "space-y-6"}>
          <div>
            <div className={isMobile ? "space-y-1" : "space-y-3"}>
              {settingsCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.title} className={`${isMobile ? "border-0 shadow-none bg-card/50" : "border-none shadow-sm"}`}>
                    <Button
                      variant="ghost"
                      className={`w-full h-auto justify-start hover:bg-muted/50 ${isMobile ? "px-3 py-2.5 rounded-lg" : "p-4 justify-between"}`}
                      onClick={() => navigate(category.path)}
                    >
                      {isMobile ? (
                        <>
                          <div className={`rounded-full bg-muted/70 p-1.5 mr-3 ${category.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="text-sm font-medium text-foreground truncate">{category.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{category.description}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3 text-left min-w-0 flex-1">
                            <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{category.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </>
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </FullScreenPageLayout>
  );
}