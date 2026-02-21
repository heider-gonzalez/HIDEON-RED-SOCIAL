import { useState, useEffect } from "react";
import { Users, Clock, Target, MapPin, Briefcase, MessageCircle, UserPlus, Check, Loader2 } from "lucide-react";
import type { Idea } from "@/types/post";
import { MentionsText } from "./MentionsText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIdeaParticipants } from "@/hooks/ideas/use-idea-participants";
import { useCreateIdeaRequest, useUserRequestStatus } from "@/hooks/ideas/use-idea-requests";
import { RequestIdeaDialog } from "./idea/RequestIdeaDialog";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface IdeaContentProps {
  idea: Idea;
  content?: string;
  postId: string;
  postOwnerId: string;
}

export function IdeaContent({ idea, content, postId, postOwnerId }: IdeaContentProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { data: participants = [] } = useIdeaParticipants(postId);
  const { data: requestStatus } = useUserRequestStatus(postId, postOwnerId);
  const createRequest = useCreateIdeaRequest();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const isOwner = currentUserId === postOwnerId;
  const isParticipant = participants.some(p => p.user_id === currentUserId);
  const hasPendingRequest = requestStatus === 'pending';
  const wasRejected = requestStatus === 'rejected';
  const canRequest = currentUserId && !isOwner && !isParticipant && !hasPendingRequest && !wasRejected;
  const canAccessIdeaChat = !!currentUserId && (isOwner || isParticipant);

  const handleSubmitRequest = async (profession: string, message?: string) => {
    await createRequest.mutateAsync({
      postId,
      profession,
      message,
      ideaOwnerId: postOwnerId
    });
    setShowRequestDialog(false);
  };

  const fullDescriptionText = (idea.description || content || '').trim();
  const shouldTruncateDescription = fullDescriptionText.length > 380;
  const truncatedDescriptionText = shouldTruncateDescription
    ? fullDescriptionText.substring(0, 380) + '...'
    : fullDescriptionText;
  const displayDescriptionText = showFullDescription ? fullDescriptionText : truncatedDescriptionText;

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
      case 'ideation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'planning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'execution': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'launch': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'scaling': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCommitmentColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      <div className="px-4 py-3 rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          {idea.project_phase && (
            <Badge className={getPhaseColor(idea.project_phase)}>
              {idea.project_phase}
            </Badge>
          )}
          {isOwner && (
            <Badge variant="outline" className="text-xs">Tu idea</Badge>
          )}
        </div>

        {/* Title */}
        {idea.title && (
          <h3 className="font-semibold text-base mb-2 text-foreground">
            {idea.title}
          </h3>
        )}

        {/* Description */}
        <MentionsText 
          content={displayDescriptionText} 
          className="text-sm text-muted-foreground whitespace-pre-wrap break-words mb-3" 
        />

        {shouldTruncateDescription && (
          <button
            type="button"
            onClick={() => setShowFullDescription((v) => !v)}
            className="text-xs text-muted-foreground hover:underline mb-3"
          >
            {showFullDescription ? 'Ver menos' : 'Ver más'}
          </button>
        )}

        <div className="space-y-2">
          <div className="pt-2 border-t border-border space-y-2">
            {canAccessIdeaChat && (
              <Button asChild variant="outline" className="w-full">
                <Link to={`/idea/${postId}/chat`}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat de la idea
                </Link>
              </Button>
            )}

            {canRequest && (
              <Button
                className="w-full"
                onClick={() => setShowRequestDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Solicitar ahora
              </Button>
            )}
            
            {hasPendingRequest && (
              <Button variant="outline" className="w-full" disabled>
                <Loader2 className="h-4 w-4 mr-2" />
                Solicitud pendiente
              </Button>
            )}
            
            {isParticipant && (
              <Button variant="outline" className="w-full" disabled>
                <Check className="h-4 w-4 mr-2" />
                Ya eres participante
              </Button>
            )}
            
            {wasRejected && (
              <Button variant="outline" className="w-full text-muted-foreground" disabled>
                Solicitud no aceptada
              </Button>
            )}
            
            {/* Contact Button */}
            {idea.contact_link && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(idea.contact_link, '_blank')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contactar
              </Button>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-xs text-muted-foreground hover:underline"
            >
              {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
            </button>
          </div>

          {showDetails && (
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                {idea.category && (
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-1" />
                    <span>{idea.category}</span>
                  </div>
                )}
                {idea.estimated_duration && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{idea.estimated_duration}</span>
                  </div>
                )}
                {idea.location_preference && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{idea.location_preference}</span>
                  </div>
                )}
              </div>

              {idea.expected_impact && (
                <div className="flex items-start">
                  <Target className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                  <div>
                    <span className="text-sm font-medium text-foreground">Impacto esperado:</span>
                    <p className="text-sm text-muted-foreground">{idea.expected_impact}</p>
                  </div>
                </div>
              )}

              {idea.needed_roles && idea.needed_roles.length > 0 && (
                <div>
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm font-medium text-foreground">Roles necesarios:</span>
                  </div>
                  <div className="space-y-2 ml-6">
                    {idea.needed_roles.map((role, index) => (
                      <div key={index} className="border border-border rounded-lg p-2 bg-muted/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-foreground">{role.title}</span>
                          <Badge className={getCommitmentColor(role.commitment_level)}>
                            {role.commitment_level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                        {role.skills_desired && role.skills_desired.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {role.skills_desired.map((skill, skillIndex) => (
                              <Badge key={skillIndex} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {idea.resources_needed && idea.resources_needed.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-foreground">Recursos necesarios:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {idea.resources_needed.map((resource, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {resource}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {idea.collaboration_type && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Modalidad:</span> {idea.collaboration_type}
                </div>
              )}

              {participants.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <Link to={`/idea/${postId}/participants`} className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {participants.slice(0, 5).map((p) => (
                        <Avatar key={p.user_id} className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={p.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {p.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {participants.length > 5 && (
                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                          +{participants.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {participants.length} {participants.length === 1 ? 'participante' : 'participantes'}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <RequestIdeaDialog
        isOpen={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        onSubmit={handleSubmitRequest}
        ideaTitle={idea.title}
        isLoading={createRequest.isPending}
      />
    </div>
  );
}
