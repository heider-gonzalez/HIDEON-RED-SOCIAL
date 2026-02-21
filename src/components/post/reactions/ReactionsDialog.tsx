import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { normalizeReactionType, reactionIcons } from "./ReactionIcons";
import { getMutualFriends } from "@/lib/friends/get-mutual-friends";
import { useAuth } from "@/hooks/use-auth";
import { ReactionUserItem } from "./ReactionUserItem";

interface Reaction {
  id: string;
  reaction_type: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  career?: string;
  mutualFriendsCount?: number;
}

interface ReactionsDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReactionsDialog({ postId, open, onOpenChange }: ReactionsDialogProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (open && postId) {
      fetchReactions();
    }
  }, [open, postId]);

  const fetchReactions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("reactions")
        .select("id, reaction_type, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reactions:", error);
        return;
      }

      // Get profiles and mutual friends
      const reactionsWithDetails = await Promise.all(
        (data || []).map(async (item: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url, career")
            .eq("id", item.user_id)
            .single();

          let mutualFriendsCount = 0;
          if (user && user.id !== item.user_id) {
            mutualFriendsCount = await getMutualFriends(user.id, item.user_id);
          }

          return {
            id: item.id,
            reaction_type: item.reaction_type,
            created_at: item.created_at,
            user_id: item.user_id,
            username: profile?.username || "Usuario",
            avatar_url: profile?.avatar_url,
            career: profile?.career,
            mutualFriendsCount,
          };
        })
      );

      setReactions(reactionsWithDetails);
    } catch (error) {
      console.error("Error in fetchReactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getReactionEmoji = (type: string) => {
    const normalizedType = normalizeReactionType(type);
    return reactionIcons[normalizedType]?.emoji || "❤️";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Reacciones ({reactions.length})
          </DialogTitle>
          <DialogDescription>
            Lista de usuarios que reaccionaron a esta publicación
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay reacciones todavía
            </p>
          ) : (
            reactions.map((reaction) => (
              <ReactionUserItem
                key={reaction.id}
                reaction={reaction}
                currentUserId={user?.id}
                getReactionEmoji={getReactionEmoji}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
