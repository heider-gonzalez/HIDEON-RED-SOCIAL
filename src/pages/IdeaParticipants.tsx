import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IdeaParticipant } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { useIdeaApprovalMutation } from "@/hooks/post-mutations/idea-join/use-idea-approval-mutation";

export default function IdeaParticipants() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [participants, setParticipants] = useState<IdeaParticipant[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const { toast } = useToast();
  const { approveParticipant, rejectParticipant, isApproving, isRejecting } = useIdeaApprovalMutation({ 
    postId: postId || "",
    onSuccess: () => {
      // Refresh participants after approval/rejection
    }
  });

  useEffect(() => {
    const fetchIdeaAndParticipants = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 1. Get post and idea data
        const { data: { user } } = await supabase.auth.getUser();
        const { data: post, error: postError } = await supabase
          .from("posts")
          .select("idea, user_id")
          .eq("id", postId)
          .single();

        if (postError) {
          console.error("Error fetching idea:", postError);
          toast({
            title: "Error",
            description: "No se pudo cargar la información de la idea",
            variant: "destructive"
          });
          return;
        }

        console.log("Post data:", post);
        
        // Check if current user is the creator
        if (user && post?.user_id === user.id) {
          setIsCreator(true);
        }
        
        // Extract idea title
        let ideaTitle = "Idea";
        if (post?.idea && typeof post.idea === 'object' && 'title' in post.idea) {
          ideaTitle = post.idea.title as string || "Idea sin título";
        }
        setIdeaTitle(ideaTitle);
        
        // 2. Get participants with profiles in a single optimized query
        const { data: participantsData, error: participantsError } = await supabase
          .from("idea_participants")
          .select("user_id, profession, joined_at, status")
          .eq("post_id", postId);
          
        if (participantsError) {
          console.error("Error fetching participants:", participantsError);
        }
        
        console.log("Participants data:", participantsData);
        
        // 3. Process participants from idea_participants table
        const formattedParticipants: IdeaParticipant[] = [];
        
        if (participantsData && participantsData.length > 0) {
          const userIds = [...new Set(participantsData.map((p: any) => p.user_id).filter(Boolean))];

          let profilesById = new Map<string, { username: string | null; avatar_url: string | null; career: string | null }>();
          if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from("profiles")
              .select("id, username, avatar_url, career")
              .in("id", userIds);

            if (profilesError) {
              console.error("Error fetching participant profiles:", profilesError);
            } else {
              (profiles || []).forEach((p: any) => {
                profilesById.set(p.id, {
                  username: p.username ?? null,
                  avatar_url: p.avatar_url ?? null,
                  career: p.career ?? null,
                });
              });
            }
          }

          participantsData.forEach((participant: any) => {
            const profile = profilesById.get(participant.user_id);
            formattedParticipants.push({
              user_id: participant.user_id,
              profession: participant.profession || "No especificado",
              career: profile?.career || "No especificado",
              joined_at: participant.joined_at,
              username: profile?.username || "Usuario",
              avatar_url: profile?.avatar_url,
              status: participant.status || 'pending',
            });
          });
        }
        
        // 4. If no participants found in idea_participants, try to get from JSON field
        if (formattedParticipants.length === 0 && post?.idea && typeof post.idea === 'object') {
          const ideaData = post.idea as any;
          
          if ('participants' in ideaData && Array.isArray(ideaData.participants)) {
            console.log("JSON participants:", ideaData.participants);
            
            // Process JSON participants
            const jsonParticipants = ideaData.participants;
            
            // Extract participant IDs that are just strings
            const participantIds: string[] = [];
            const fullParticipants: IdeaParticipant[] = [];
            
            jsonParticipants.forEach((p: any) => {
              if (typeof p === 'string') {
                participantIds.push(p);
              } else if (p && typeof p === 'object' && 'user_id' in p) {
                fullParticipants.push({
                  user_id: p.user_id,
                  profession: p.profession || "No especificado",
                  career: p.career || "No especificado",
                  joined_at: p.joined_at || new Date().toISOString(),
                  username: p.username || "Usuario",
                  avatar_url: p.avatar_url
                });
              }
            });
            
            console.log("Participant IDs:", participantIds);
            console.log("Full participants:", fullParticipants);
            
            // If there are simple user IDs, get their profiles
            if (participantIds.length > 0) {
              const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, username, avatar_url, career")
                .in("id", participantIds);
                
              if (profilesError) {
                console.error("Error fetching profiles:", profilesError);
              } else if (profiles && profiles.length > 0) {
                console.log("Profiles obtained:", profiles);
                
                const participantsFromProfiles = profiles.map(profile => ({
                  user_id: profile.id,
                  username: profile.username || "Usuario",
                  avatar_url: profile.avatar_url || null,
                  profession: "No especificado",
                  career: profile.career || "No especificado",
                  joined_at: new Date().toISOString()
                }));
                
                // Combine full participants and those from profiles
                formattedParticipants.push(...fullParticipants, ...participantsFromProfiles);
              } else {
                formattedParticipants.push(...fullParticipants);
              }
            } else {
              formattedParticipants.push(...fullParticipants);
            }
          }
        }
        
        // 5. If still no participants, add the post creator as default participant
        if (formattedParticipants.length === 0 && post?.user_id) {
          console.log("No participants found, fetching creator profile:", post.user_id);
          
          const { data: creatorProfile, error: creatorError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, career")
            .eq("id", post.user_id)
            .single();
            
          if (!creatorError && creatorProfile) {
            formattedParticipants.push({
              user_id: creatorProfile.id,
              username: creatorProfile.username || "Creador",
              avatar_url: creatorProfile.avatar_url,
              profession: "Creador del proyecto",
              career: creatorProfile.career || "No especificado",
              joined_at: new Date().toISOString()
            });
          }
        }
        
        // 6. Set participants and finish loading
        console.log("Final formatted participants:", formattedParticipants);
        setParticipants(formattedParticipants);
      } catch (error) {
        console.error("Complete error:", error);
        toast({
          title: "Error",
          description: "Ocurrió un error al cargar los participantes",
          variant: "destructive"
        });
      } finally {
        // ALWAYS stop loading, even if there's an error
        setLoading(false);
      }
    };

    fetchIdeaAndParticipants();
    
    // Set up real-time subscription for updates
    const channel = supabase
      .channel(`idea_participants_updates_${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'idea_participants',
        filter: `post_id=eq.${postId}`
      }, () => {
        console.log("Change detected in participants, reloading...");
        fetchIdeaAndParticipants();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, toast, approveParticipant, rejectParticipant, isApproving, isRejecting]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          className="mb-4 pl-0" 
          onClick={handleBack}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participantes de la idea: {ideaTitle}
            </CardTitle>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay participantes en esta idea todavía.
              </div>
            ) : (
              <ul className="space-y-4">
                {participants.map((participant, index) => (
                  <li key={`participant-${participant.user_id || index}`} className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50">
                    <Avatar className="h-10 w-10">
                      {participant.avatar_url ? (
                        <AvatarImage src={participant.avatar_url} alt={participant.username || "Usuario"} />
                      ) : (
                        <AvatarFallback>
                          {participant.username ? participant.username.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{participant.username || 'Usuario'}</span>
                        {participant.status && (
                          <Badge 
                            variant={participant.status === 'approved' ? 'default' : participant.status === 'rejected' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {participant.status === 'approved' ? '✓ Aprobado' : participant.status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {participant.career && participant.career !== 'No especificado' && (
                          <Badge variant="secondary" className="text-xs">
                            🎓 {participant.career}
                          </Badge>
                        )}
                        {participant.profession && participant.profession !== 'No especificado' && (
                          <Badge variant="outline" className="text-xs">
                            💼 {participant.profession}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isCreator && participant.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveParticipant(participant.user_id)}
                          disabled={isApproving}
                          className="h-8"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectParticipant(participant.user_id)}
                          disabled={isRejecting}
                          className="h-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
