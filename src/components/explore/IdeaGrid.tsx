import { useIdeas } from "@/hooks/ideas/use-ideas";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useIdeaParticipantsCount } from "@/hooks/ideas/use-idea-participants-count";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Post } from "@/components/Post";
import type { Post as PostType } from "@/types/post";
import { JoinIdeaButton } from "@/components/post/actions/join-idea/JoinIdeaButton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function IdeaGrid({
  searchQuery,
  institutionName,
}: {
  searchQuery: string;
  institutionName?: string;
}) {
  const [selectedPost, setSelectedPost] = useState<PostType | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const { data: ideas, isLoading } = useIdeas({ searchQuery, institutionName, limit: 20 });

  const postIds = ideas?.map(idea => idea.id) || [];
  const { data: participantCounts } = useIdeaParticipantsCount(postIds);

  if (isLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
    </div>;
  }

  if (!ideas || ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Todavía no hay ideas por aquí</p>
        <p className="text-xs text-muted-foreground mt-1">Si tienes algo en mente, compártelo y vemos quién se suma.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {ideas?.map((idea) => {
        const participantCount = participantCounts?.get(idea.id) || 0;
        const isJoinableIdea = !!(idea as any)?.idea;
        const ideaAny = (idea as any)?.idea;
        const ideaTitle = String(ideaAny?.title || '').trim();
        const fallbackTitle = String(idea.content || '').trim();
        const titleToShow = ideaTitle || fallbackTitle;
        const trimmedTitle = titleToShow ? titleToShow.substring(0, 60) : "";
        const shouldEllipsis = Boolean(titleToShow && titleToShow.length > 60);
        
        return (
          <Card 
            key={idea.id} 
            className="overflow-hidden cursor-pointer rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            onClick={() => {
              setSelectedPost(idea as PostType);
              setShowPostModal(true);
            }}
          >
            {/* Imagen o placeholder */}
            {idea.media_url ? (
              <img 
                src={idea.media_url} 
                alt={idea.content}
                className="w-full h-44 object-cover"
              />
            ) : (
              <div className="w-full h-44 bg-gradient-to-br from-[#FDBA74] via-[#F97316] to-[#EA580C] flex items-center justify-center relative">
                <Lightbulb className="h-14 w-14 text-white" />
                <span className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/15 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
              </div>
            )}
            
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
                {titleToShow ? `${trimmedTitle}${shouldEllipsis ? "..." : ""}` : "Idea sin título"}
              </h3>
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6">
                  <AvatarImage src={idea.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {idea.profiles?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate">
                    @{idea.profiles?.username || 'usuario'}
                  </span>
                </div>

                <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", participantCount > 0 ? "opacity-100" : "opacity-0")}>
                  <Users className="h-3.5 w-3.5" />
                  <span>{participantCount}</span>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-9 text-xs rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPost(idea as PostType);
                    setShowPostModal(true);
                  }}
                >
                  Ver publicación
                </Button>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {isJoinableIdea ? (
                    <JoinIdeaButton
                      postId={idea.id}
                      size="sm"
                      variant="outline"
                      className="h-9 w-full text-xs rounded-xl border-orange-500 text-orange-500 hover:bg-orange-500/10"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9 w-full text-xs rounded-xl"
                      onClick={() => {
                        toast({
                          title: "No disponible",
                          description: "Esta publicación no está configurada como idea colaborativa para recibir solicitudes.",
                        });
                      }}
                    >
                      No disponible
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>

      <Dialog
        open={showPostModal && !!selectedPost}
        onOpenChange={(open) => {
          setShowPostModal(open);
          if (!open) setSelectedPost(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-base">Publicación</DialogTitle>
          </DialogHeader>

          <div className="p-4">
            {selectedPost && <Post post={selectedPost} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
