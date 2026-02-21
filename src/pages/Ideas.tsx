import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Ideas() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              Ideas
            </h1>
            <p className="text-muted-foreground mt-1">
              Descubre ideas que buscan colaboradores
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Publicar Idea
          </Button>
        </div>

        {/* Search and Filter */}
        <Card className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar ideas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </Button>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            Todas
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Buscan desarrolladores
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Buscan diseñadores
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Buscan marketers
          </Badge>
        </div>

        {/* Empty State */}
        <Card className="p-12 text-center">
          <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay ideas disponibles</h3>
          <p className="text-muted-foreground mb-6">
            Sé el primero en compartir una idea innovadora
          </p>
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Publicar Primera Idea
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
