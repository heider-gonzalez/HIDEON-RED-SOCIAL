import { useState } from "react";
import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Lightbulb, FolderOpen, Users, Plus } from "lucide-react";
import { IdeaGrid } from "@/components/explore/IdeaGrid";
import { ProjectGrid } from "@/components/explore/ProjectGrid";
import { GroupGrid } from "@/components/explore/GroupGrid";
import { UserGrid } from "@/components/explore/UserGrid";
import { InstitutionCombobox } from "@/components/filters/InstitutionCombobox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePostComposer } from "@/providers/PostComposerProvider";

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ideas");
  const [institutionName, setInstitutionName] = useState("");
  const [postType, setPostType] = useState<'idea' | 'proyecto'>('idea');
  const { user } = useAuth();
  const { open: openComposer } = usePostComposer();

  return (
    <Layout hideLeftSidebar hideRightSidebar>
      <div className="min-h-screen bg-background">
        {/* Sticky header: search + filters + tabs */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="px-3 sm:px-4 py-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Busca ideas, proyectos o personas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-lg bg-muted border-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <InstitutionCombobox value={institutionName} onChange={setInstitutionName} />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-12 rounded-none bg-background justify-start gap-1 px-2 overflow-x-auto">
            <TabsTrigger 
              value="ideas" 
              className="shrink-0 gap-2 text-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-3 text-xs sm:text-sm"
            >
              <Lightbulb className="h-4 w-4" />
              Ideas
            </TabsTrigger>
            <TabsTrigger 
              value="proyectos" 
              className="shrink-0 gap-2 text-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-3 text-xs sm:text-sm"
            >
              <FolderOpen className="h-4 w-4" />
              Proyectos
            </TabsTrigger>
            <TabsTrigger 
              value="grupos" 
              className="shrink-0 gap-2 text-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-3 text-xs sm:text-sm"
            >
              <Users className="h-4 w-4" />
              Grupos
            </TabsTrigger>
            <TabsTrigger 
              value="lideres" 
              className="shrink-0 gap-2 text-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-3 text-xs sm:text-sm"
            >
              <Users className="h-4 w-4" />
              Personas
            </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content tabs - 4 tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="ideas" className="px-3 py-4 sm:p-4 mt-0">
            <IdeaGrid searchQuery={searchQuery} institutionName={institutionName} />
          </TabsContent>

          <TabsContent value="proyectos" className="px-3 py-4 sm:p-4 mt-0">
            <ProjectGrid searchQuery={searchQuery} institutionName={institutionName} />
          </TabsContent>

          <TabsContent value="grupos" className="px-3 py-4 sm:p-4 mt-0">
            <GroupGrid searchQuery={searchQuery} />
          </TabsContent>

          <TabsContent value="lideres" className="px-3 py-4 sm:p-4 mt-0">
            <UserGrid searchQuery={searchQuery} />
          </TabsContent>
        </Tabs>
        
        {/* Floating Action Button for authenticated users */}
        {user && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => openComposer({ initialPostType: postType })}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
