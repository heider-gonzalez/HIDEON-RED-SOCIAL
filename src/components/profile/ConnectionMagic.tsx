import { Heart, MapPin, Clock, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHybridUrl } from "@/lib/hybrid-url";

export interface ConnectionSuggestion {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  connection_reason: string;
  compatibility_score: number;
  shared_interests: string[];
  complementary_traits: string[];
  availability_match: boolean;
}

interface ConnectionMagicProps {
  suggestions: ConnectionSuggestion[];
  onConnect: (userId: string) => void;
  onPass: (userId: string) => void;
}

export function ConnectionMagic({ suggestions, onConnect, onPass }: ConnectionMagicProps) {
  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-primary" />
            Conexiones Sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Completa tu perfil para recibir sugerencias de conexión personalizadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Heart className="h-5 w-5 mr-2 text-primary" />
          Conexiones Sugeridas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="border border-border rounded-lg p-4 bg-muted/20">
            {/* User Info */}
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                {suggestion.avatar_url ? (
                  <img 
                    src={getHybridUrl(suggestion.avatar_url) || "/placeholder.svg"} 
                    alt={suggestion.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Users className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">@{suggestion.username}</h3>
                  <span className={`text-sm font-medium ${getCompatibilityColor(suggestion.compatibility_score)}`}>
                    {suggestion.compatibility_score}% match
                  </span>
                </div>
                {suggestion.location && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {suggestion.location}
                  </div>
                )}
                {suggestion.bio && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{suggestion.bio}</p>
                )}
              </div>
            </div>

            {/* Connection Reason */}
            <div className="mb-3">
              <div className="flex items-start">
                <Target className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">Por qué conectar:</span>
                  <p className="text-sm text-muted-foreground">{suggestion.connection_reason}</p>
                </div>
              </div>
            </div>

            {/* Shared Interests */}
            {suggestion.shared_interests.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-medium text-foreground">Intereses compartidos:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {suggestion.shared_interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Complementary Traits */}
            {suggestion.complementary_traits.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-medium text-foreground">Fortalezas complementarias:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {suggestion.complementary_traits.map((trait, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Availability Match */}
            {suggestion.availability_match && (
              <div className="flex items-center text-xs text-green-600 dark:text-green-400 mb-3">
                <Clock className="h-3 w-3 mr-1" />
                <span>Horarios compatibles para colaborar</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onConnect(suggestion.id)}
                className="flex-1"
              >
                Conectar
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onPass(suggestion.id)}
                className="flex-1"
              >
                Pasar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}