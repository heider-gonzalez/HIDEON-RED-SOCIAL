import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, User, Shield, Lock, Bell, HelpCircle, LogOut, Moon, Sun, Palette, Heart, BarChart3, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";

export default function Settings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const current = theme === "dark" || theme === "tech" ? theme : "light";
    const next = current === "light" ? "dark" : current === "dark" ? "tech" : "light";
    setTheme(next);
  };

  const themeLabel = theme === "tech" ? "Negro azulado" : theme === "dark" ? "Negro puro" : "Claro";
  const themeDescription =
    theme === "tech"
      ? "Negro azulado premium (estilo tech)"
      : theme === "dark"
        ? "Negro puro (estilo X)"
        : "Blanco limpio (estilo Instagram)";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const settingsCategories = [
    {
      title: "Cuenta",
      description: "Administra tu información personal y configuración de la cuenta",
      icon: User,
      path: "/settings/account",
      color: "text-blue-600"
    },
    {
      title: "Personalización",
      description: "Configura tu foto de perfil, banner y apariencia",
      icon: Image,
      path: "/settings/personalization",
      color: "text-primary"
    },
    {
      title: "Mis Estadísticas",
      description: "Ve tus corazones, vistas de perfil y nivel social",
      icon: BarChart3,
      path: "/settings/statistics",
      color: "text-emerald-600"
    },
    {
      title: "Privacidad",
      description: "Controla quién puede ver tu contenido y actividad",
      icon: Shield,
      path: "/settings/privacy",
      color: "text-green-600"
    },
    {
      title: "Contraseña y seguridad",
      description: "Protege tu cuenta con configuración de seguridad avanzada",
      icon: Lock,
      path: "/settings/security",
      color: "text-orange-600"
    },
    {
      title: "Notificaciones",
      description: "Personaliza cómo y cuándo recibes notificaciones",
      icon: Bell,
      path: "/settings/notifications",
      color: "text-purple-600"
    },
    {
      title: "Popularidad",
      description: "Ve el ranking de usuarios más populares",
      icon: Heart,
      path: "/popularity",
      color: "text-pink-600"
    }
  ];

  const additionalOptions = [
    {
      title: "Centro de ayuda",
      description: "Obtén ayuda y soporte técnico",
      icon: HelpCircle,
      action: () => {},
      color: "text-gray-600"
    },
    {
      title: "Cerrar sesión",
      description: "Salir de tu cuenta",
      icon: LogOut,
      action: handleLogout,
      color: "text-red-600"
    }
  ];

  return (
    <FullScreenPageLayout title="Configuración">
      <div className={`w-full ${isMobile ? 'px-2 py-3' : 'container max-w-2xl mx-auto px-4 py-6'}`}>

        <div className={isMobile ? "space-y-3" : "space-y-6"}>
          {/* Main Settings */}
          <div>
            {!isMobile && (
              <h2 className="text-lg font-semibold mb-4 text-foreground">Configuración principal</h2>
            )}
            <div className={isMobile ? "space-y-1" : "space-y-3"}>
              {settingsCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Card key={category.title} className={`${isMobile ? 'border-0 shadow-none bg-card/50' : 'border-none shadow-sm'}`}>
                    <Button
                      variant="ghost"
                      className={`w-full h-auto justify-start hover:bg-muted/50 ${
                        isMobile 
                          ? 'px-3 py-2.5 rounded-lg' 
                          : 'p-4 justify-between'
                      }`}
                      onClick={() => navigate(category.path)}
                    >
                      {/* Mobile Layout: Icon - Text - Arrow */}
                      {isMobile ? (
                        <>
                          <div className={`rounded-full bg-muted/70 p-1.5 mr-3 ${category.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="text-sm font-medium text-foreground truncate">
                              {category.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {category.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                        </>
                      ) : (
                        /* Desktop Layout */
                        <>
                          <div className="flex items-start gap-3 text-left min-w-0 flex-1">
                            <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{category.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {category.description}
                              </p>
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

          {/* Theme Toggle */}
          <div>
            {!isMobile && (
              <h2 className="text-lg font-semibold mb-4 text-foreground">Tema</h2>
            )}
            <Card className={`${isMobile ? 'border-0 shadow-none bg-card/50' : 'border-none shadow-sm'}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'p-4'}`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-full bg-muted/70 p-1.5 ${isMobile ? '' : 'p-2 rounded-lg bg-muted'}`}>
                    {theme === "light" ? (
                      <Sun className={`h-4 w-4 text-amber-500 ${isMobile ? '' : 'h-5 w-5'}`} />
                    ) : (
                      <Moon className={`h-4 w-4 ${theme === "tech" ? 'text-cyan-500' : 'text-indigo-600'} ${isMobile ? '' : 'h-5 w-5'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className={`font-medium text-foreground ${isMobile ? 'text-sm' : 'font-semibold'}`}>
                      {themeLabel}
                    </h3>
                    <p className={`text-muted-foreground ${isMobile ? 'text-xs line-clamp-1 mt-0.5' : 'text-sm mt-1'}`}>
                      {themeDescription}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={cycleTheme}>
                  Cambiar
                </Button>
              </div>
            </Card>
          </div>

          {/* Additional Options */}
          <div>
            {!isMobile && (
              <h2 className="text-lg font-semibold mb-4 text-foreground">Más opciones</h2>
            )}
            <div className={isMobile ? "space-y-1" : "space-y-3"}>
              {additionalOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <Card key={option.title} className={`${isMobile ? 'border-0 shadow-none bg-card/50' : 'border-none shadow-sm'}`}>
                    <Button
                      variant="ghost"
                      className={`w-full h-auto justify-start hover:bg-muted/50 ${
                        isMobile 
                          ? 'px-3 py-2.5 rounded-lg' 
                          : 'p-4 justify-between'
                      }`}
                      onClick={option.action}
                    >
                      {/* Mobile Layout: Icon - Text - Arrow */}
                      {isMobile ? (
                        <>
                          <div className={`rounded-full bg-muted/70 p-1.5 mr-3 ${option.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="text-sm font-medium text-foreground truncate">
                              {option.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {option.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                        </>
                      ) : (
                        /* Desktop Layout */
                        <>
                          <div className="flex items-start gap-3 text-left min-w-0 flex-1">
                            <div className={`p-2 rounded-lg bg-muted ${option.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{option.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {option.description}
                              </p>
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