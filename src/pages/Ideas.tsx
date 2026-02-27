import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { IdeaGrid } from "@/components/explore/IdeaGrid";
import ModalPublicacionWeb from "@/components/ModalPublicacionWeb";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { InstitutionCombobox } from "@/components/filters/InstitutionCombobox";

export default function Ideas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const { user } = useUser();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!showPublishModal || !user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (!isMounted) return;
      if (error) {
        setProfileAvatarUrl(null);
        return;
      }
      setProfileAvatarUrl(data?.avatar_url ?? null);
    };

    void loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [showPublishModal, user?.id]);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              Ideas
            </h1>
            <p className="text-muted-foreground mt-1">
              Descubre ideas que buscan colaboradores
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowPublishModal(true)}>
            <Plus className="h-5 w-5" />
            Publicar Idea
          </Button>
        </div>

        {/* Search and Filter */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar ideas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="sm:w-[320px]">
              <InstitutionCombobox value={institutionName} onChange={setInstitutionName} />
            </div>
            <Button variant="outline" className="gap-2 h-11">
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
        <Card className="p-6">
          <IdeaGrid searchQuery={searchTerm} institutionName={institutionName} />
        </Card>
      </div>

      <ModalPublicacionWeb
        isVisible={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        initialPostType={"idea"}
        userAvatar={profileAvatarUrl || (user?.user_metadata as any)?.avatar_url}
      />
    </Layout>
  );
}
