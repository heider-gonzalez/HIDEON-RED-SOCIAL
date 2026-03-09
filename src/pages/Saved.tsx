import { Bookmark } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Saved() {
  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="h-8 w-8" />
        <h1 className="text-2xl font-bold">Guardados</h1>
      </div>

      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Bookmark className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No hay contenido guardado</h2>
          <p className="text-muted-foreground">
            Guarda publicaciones, ideas y proyectos para verlos más tarde
          </p>
        </div>
      </Card>
    </div>
  );
}
