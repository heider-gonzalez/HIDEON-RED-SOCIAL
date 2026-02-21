import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Teams() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Equipos
            </h1>
            <p className="text-muted-foreground mt-1">
              Busca equipos de trabajo o crea el tuyo
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Crear Equipo
          </Button>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar equipos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Empty State */}
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay equipos disponibles</h3>
          <p className="text-muted-foreground mb-6">
            Crea el primer equipo y comienza a colaborar
          </p>
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Crear Primer Equipo
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
