import { Button } from "@/components/ui/button";
import { 
  LogOut,
  Moon,
  Settings,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Monitor,
  Bookmark,
  HeartHandshake,
  PlaySquare,
  Brain,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MenuOptionsProps {
  userId: string | null;
  onClose: () => void;
  onCopyProfileLink: () => void;
}

export function MenuOptions({ userId, onClose, onCopyProfileLink }: MenuOptionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [showDonate, setShowDonate] = useState(false);
  const [showSettingsPrivacy, setShowSettingsPrivacy] = useState(false);
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar sesión",
      });
    } else {
      onClose();
      navigate("/auth");
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSettingsPrivacyNavigate = (path: string) => {
    setShowSettingsPrivacy(false);
    handleNavigate(path);
  };

  const cycleTheme = () => {
    const current = theme === "dark" || theme === "tech" ? theme : "light";
    const next = current === "light" ? "dark" : current === "dark" ? "tech" : "light";
    setTheme(next);
  };

  const themeLabel = theme === "tech" ? "Negro azulado" : theme === "dark" ? "Negro puro" : "Claro";

  return (
    <div className="px-2 pb-4 bg-background">
      {/* Ver todos los perfiles - Destacado */}
      <div className="px-2 py-3">
        <Button
          variant="secondary"
          className="w-full justify-start h-11 px-3 rounded-lg font-semibold"
          onClick={() => handleNavigate(`/profile/${userId}`)}
        >
          <Users className="h-5 w-5 mr-3" />
          <span>Ver todos los perfiles</span>
        </Button>
      </div>
      
      <Separator className="my-1" />
      
      {/* Coquitos Destacados */}
      <div className="py-1">
        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => handleNavigate("/leaderboard")}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Coquitos Destacados</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
        
        {/* Carpetas / Guardados */}
        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => handleNavigate("/saved")}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <Bookmark className="h-5 w-5" />
            </div>
            <span className="font-medium">Guardados</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => handleNavigate("/reels")}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <PlaySquare className="h-5 w-5" />
            </div>
            <span className="font-medium">Reels</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
      
        <Separator className="my-2" />
      
        {/* Configuración y privacidad */}
        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => setShowSettingsPrivacy(true)}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <Settings className="h-5 w-5" />
            </div>
            <span className="font-medium">Configuración y privacidad</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
        
        {/* Ayuda y asistencia */}
        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => toast({
            title: "Ayuda y asistencia",
            description: "Centro de ayuda próximamente disponible"
          })}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <HelpCircle className="h-5 w-5" />
            </div>
            <span className="font-medium">Ayuda y asistencia</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
        
        {/* Tema */}
        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => {
            const current = theme === "dark" || theme === "tech" ? theme : "light";
            const next = current === "light" ? "dark" : current === "dark" ? "tech" : "light";
            const nextLabel = next === "tech" ? "Negro azulado" : next === "dark" ? "Negro puro" : "Claro";
            setTheme(next);
            toast({
              title: "Tema",
              description: `Ahora: ${nextLabel}`,
            });
          }}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Tema</span>
              <span className="text-xs text-muted-foreground">{themeLabel}</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
        
        {/* Pantalla y accesibilidad */}
        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => handleNavigate("/settings/accessibility")}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <Moon className="h-5 w-5" />
            </div>
            <span className="font-medium">Pantalla y accesibilidad</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
        
        {/* Enviar comentarios */}
        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => {
            window.open('https://wa.me/573014343180', '_blank', 'noopener,noreferrer');
            onClose();
            toast({
              title: "Enviar comentarios",
              description: "Gracias por ayudar a mejorar. Te abriré WhatsApp para enviarme tu mensaje."
            });
          }}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Enviar comentarios</span>
              <span className="text-xs text-muted-foreground">CTRL B</span>
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
          onClick={() => setShowDonate(true)}
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
              <HeartHandshake className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Donar al desarrollador (Nequi)</span>
              <span className="text-xs text-muted-foreground">Gracias por tu apoyo</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
        
        {/* Cerrar sesión */}
        <Button
          variant="ghost"
          className="w-full justify-start h-14 px-3 rounded-lg hover:bg-accent"
          onClick={handleLogout}
        >
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mr-3">
            <LogOut className="h-5 w-5" />
          </div>
          <span className="font-medium">Cerrar sesión</span>
        </Button>
      </div>
      
      {/* Footer Links */}
      <div className="px-3 py-4 mt-2">
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          <button className="hover:underline" onClick={() => handleNavigate("/privacy")}>Política de Privacidad</button>
          <span>·</span>
          <button className="hover:underline" onClick={() => handleNavigate("/terms")}>Términos y Condiciones</button>
          <span>·</span>
          <button className="hover:underline" onClick={() => toast({ title: "Publicidad", description: "Próximamente" })}>Publicidad</button>
          <span>·</span>
          <button className="hover:underline" onClick={() => toast({ title: "Opciones de anuncios", description: "Próximamente" })}>Opciones de anuncios</button>
          <span>·</span>
          <button className="hover:underline" onClick={() => toast({ title: "Cookies", description: "Próximamente" })}>Cookies</button>
          <span>·</span>
          <button className="hover:underline" onClick={() => toast({ title: "Más", description: "Próximamente" })}>Más</button>
        </div>
      </div>

      <Dialog open={showDonate} onOpenChange={setShowDonate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Donar al desarrollador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <img
                src="/nequi-qr.png"
                alt="QR Nequi"
                className="w-full max-w-[320px] mx-auto rounded-md"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Tu apoyo mantiene vivo el proyecto.
              <br />
              Gracias por creer en lo que estamos construyendo.
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowDonate(false);
                onClose();
                toast({
                  title: "Gracias",
                  description: "Tu apoyo significa mucho."
                });
              }}
            >
              Listo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsPrivacy} onOpenChange={setShowSettingsPrivacy}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración y privacidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
              onClick={() => handleSettingsPrivacyNavigate("/settings/personalization")}
            >
              <span className="font-medium">Perfil</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
              onClick={() => handleSettingsPrivacyNavigate("/settings/account")}
            >
              <span className="font-medium">Cuenta</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
              onClick={() => handleSettingsPrivacyNavigate("/settings/privacy")}
            >
              <span className="font-medium">Privacidad</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between h-14 px-3 rounded-lg hover:bg-accent"
              onClick={() => handleSettingsPrivacyNavigate("/settings/security")}
            >
              <span className="font-medium">Contraseña</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setShowSettingsPrivacy(false)}
          >
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}