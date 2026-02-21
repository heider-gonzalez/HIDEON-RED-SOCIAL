import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { normalizeReactionType, reactionIcons, type ReactionType } from "./ReactionIcons";
import { Loader2 } from "lucide-react";

interface Reaction {
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface ReactionsListDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReactionsListDialog({ postId, open, onOpenChange }: ReactionsListDialogProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | ReactionType>("all");

  useEffect(() => {
    if (open && postId) {
      loadReactions();
    }
  }, [open, postId]);

  const loadReactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('user_id, reaction_type, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const base = (data as any[] | null) || [];
      const userIds = [...new Set(base.map((r) => r.user_id).filter(Boolean))];

      let profilesMap = new Map<string, { username: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (!profilesError) {
          (profiles || []).forEach((p: any) => {
            profilesMap.set(p.id, {
              username: p.username ?? null,
              avatar_url: p.avatar_url ?? null,
            });
          });
        }
      }

      setReactions(
        base.map((r) => ({
          ...r,
          profiles: profilesMap.get(r.user_id) || null,
        })) as any
      );
    } catch (error) {
      console.error('Error loading reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReactionCounts = () => {
    const counts: Record<string, number> = {};
    reactions.forEach((r) => {
      const t = normalizeReactionType(r.reaction_type);
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  };

  const filteredReactions = activeTab === "all" 
    ? reactions 
    : reactions.filter(r => normalizeReactionType(r.reaction_type) === activeTab);

  const counts = getReactionCounts();
  const totalCount = reactions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Reacciones ({totalCount})</DialogTitle>
          <DialogDescription className="sr-only">
            Lista de usuarios que reaccionaron a esta publicación
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-4 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Todas {totalCount}
            </TabsTrigger>
            {Object.entries(counts).map(([type, count]) => {
              const normalizedType = normalizeReactionType(type);
              const reaction = reactionIcons[normalizedType];
              if (!reaction) return null;
              return (
                <TabsTrigger 
                  key={normalizedType}
                  value={normalizedType}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <span className="mr-1">{reaction.emoji}</span> {count}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay reacciones todavía
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReactions.map((reaction) => {
                  const reactionData = reactionIcons[normalizeReactionType(reaction.reaction_type)];
                  return (
                    <div key={`${reaction.user_id}-${reaction.created_at}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={reaction.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {reaction.profiles?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {reaction.profiles?.username || 'Usuario'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{reaction.profiles?.username?.toLowerCase().replace(/\s+/g, '_') || 'usuario'}
                          </p>
                        </div>
                      </div>
                      <div className="text-2xl">
                        {reactionData?.emoji}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
