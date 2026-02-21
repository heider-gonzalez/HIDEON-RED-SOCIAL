import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Search, MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Events() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              Eventos
            </h1>
            <p className="text-muted-foreground mt-1">
              Hackathons, conferencias y eventos universitarios
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Crear Evento
          </Button>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Categories */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            Todos
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Hackathons
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Conferencias
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Workshops
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Networking
          </Badge>
        </div>

        {/* Empty State */}
        <Card className="p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay eventos próximos</h3>
          <p className="text-muted-foreground mb-6">
            Crea el primer evento y comienza a organizar
          </p>
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Crear Primer Evento
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
