import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, Lightbulb, Plus, Search, Sparkles, Code2, PencilRuler, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { IdeaGrid } from "@/components/explore/IdeaGrid";
import { InstitutionCombobox } from "@/components/filters/InstitutionCombobox";
import { usePostComposer } from "@/providers/PostComposerProvider";

export default function Ideas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "dev" | "design" | "mkt">("all");
  const { open: openComposer } = usePostComposer();

  return (
    <Layout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white flex items-center justify-center shadow-lg">
              <Lightbulb className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Ideas</h1>
              <p className="text-sm text-muted-foreground">Descubre ideas que buscan colaboradores</p>
            </div>
          </div>
          <Button
            className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-600/95 hover:to-blue-600/95 text-white shadow-lg font-semibold px-6"
            onClick={() => openComposer({ initialPostType: "idea" })}
          >
            <Plus className="h-5 w-5" />
            Publicar idea
          </Button>
        </div>

        {/* Search and Filter */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar ideas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 rounded-full bg-background"
              />
            </div>
            <div className="sm:w-[260px]">
              <InstitutionCombobox
                value={institutionName}
                onChange={setInstitutionName}
                className="h-11 rounded-full"
              />
            </div>
            <Button variant="outline" className="gap-2 h-11 rounded-full px-4">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={
              activeFilter === "all"
                ? "bg-violet-600 text-white font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2"
            }
          >
            <span className="text-lg">~</span>
            Todas
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("dev")}
            className={
              activeFilter === "dev"
                ? "bg-violet-600 text-white font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2"
            }
          >
            <Code2 className="h-4 w-4" />
            Buscan desarrolladores
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("design")}
            className={
              activeFilter === "design"
                ? "bg-violet-600 text-white font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2"
            }
          >
            <PencilRuler className="h-4 w-4" />
            Buscan diseñadores
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("mkt")}
            className={
              activeFilter === "mkt"
                ? "bg-violet-600 text-white font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground font-medium px-4 py-2 rounded-xl inline-flex items-center gap-2"
            }
          >
            <Megaphone className="h-4 w-4" />
            Buscan marketers
          </button>
        </div>

        {/* Empty State */}
        <IdeaGrid searchQuery={searchTerm} institutionName={institutionName} />
      </div>

    </Layout>
  );
}
