import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(resolvedTheme !== "light");

  useEffect(() => {
    setIsDark(resolvedTheme !== "light");
  }, [resolvedTheme]);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Configuración</h1>
        </div>
      </div>

      {/* Opciones */}
      <div className="p-4">
        <div className="space-y-6">
          {/* Pantalla y accesibilidad */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              PANTALLA Y ACCESIBILIDAD
            </h2>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon className="h-5 w-5 text-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">Modo {isDark ? "Oscuro" : "Claro"}</p>
                    <p className="text-sm text-muted-foreground">
                      {isDark ? "Fondo negro con texto blanco" : "Fondo blanco con texto negro"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                >
                  Cambiar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
