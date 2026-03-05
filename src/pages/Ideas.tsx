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
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#ff8a00] flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-[#ff8a00] text-white flex items-center justify-center shadow-sm">
                <Lightbulb className="h-5 w-5" />
              </span>
              Ideas
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#ff8a00]" />
              Descubre ideas que buscan colaboradores
            </p>
          </div>
          <Button
            className="gap-2 rounded-full bg-gradient-to-r from-[#ff8a00] to-[#ff6a00] hover:from-[#ff8a00]/95 hover:to-[#ff6a00]/95 text-white shadow-sm"
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
        <div className="flex items-center gap-6 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={
              activeFilter === "all"
                ? "text-[#ff8a00] font-semibold border-b-2 border-[#ff8a00] pb-2 inline-flex items-center gap-2"
                : "text-muted-foreground hover:text-foreground pb-2 inline-flex items-center gap-2"
            }
          >
            <span className={activeFilter === "all" ? "text-[#ff8a00]" : "text-muted-foreground"}>~</span>
            Todas
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("dev")}
            className={
              activeFilter === "dev"
                ? "text-foreground font-semibold border-b-2 border-[#ff8a00] pb-2 inline-flex items-center gap-2"
                : "text-muted-foreground hover:text-foreground pb-2 inline-flex items-center gap-2"
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
                ? "text-foreground font-semibold border-b-2 border-[#ff8a00] pb-2 inline-flex items-center gap-2"
                : "text-muted-foreground hover:text-foreground pb-2 inline-flex items-center gap-2"
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
                ? "text-foreground font-semibold border-b-2 border-[#ff8a00] pb-2 inline-flex items-center gap-2"
                : "text-muted-foreground hover:text-foreground pb-2 inline-flex items-center gap-2"
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
