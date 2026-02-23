
import { Link } from "react-router-dom";
import { FriendSuggestion } from "@/types/friends";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Briefcase, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FollowButton } from "@/components/FollowButton";

interface FriendSuggestionItemProps {
  suggestion: FriendSuggestion;
  batchFollowingStatus?: boolean;
  onBatchFollowingUpdate?: (userId: string, isFollowing: boolean) => void;
}

export function FriendSuggestionItem({ 
  suggestion,
  batchFollowingStatus,
  onBatchFollowingUpdate
}: FriendSuggestionItemProps) {
  // Added fallback for careerMatch and semesterMatch
  const hasCareerMatch = suggestion.careerMatch === true;
  const hasSemesterMatch = suggestion.semesterMatch === true;
  
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${
        hasCareerMatch || hasSemesterMatch 
          ? 'border-primary/50 bg-primary/5' 
          : 'hover:bg-accent'
      }`}
    >
      <Link
        to={`/profile/${suggestion.id}`}
        className="flex items-center gap-3"
      >
        <Avatar>
          <AvatarImage src={suggestion.avatar_url || undefined} />
          <AvatarFallback>
            {suggestion.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="font-bold text-[#050505] dark:text-white [.tech_&]:text-white">{suggestion.username}</div>
          <div className="flex flex-wrap gap-2">
            {suggestion.career && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Briefcase className="inline-block h-3 w-3 mr-1" />
                <span className={hasCareerMatch ? "font-medium text-primary" : ""}>
                  {suggestion.career}
                  {hasCareerMatch && 
                    <Badge variant="outline" className="ml-1 bg-primary/10 text-primary text-[10px] py-0 h-4">
                      Coincide
                    </Badge>
                  }
                </span>
              </div>
            )}
            {suggestion.semester && (
              <div className="flex items-center text-xs text-muted-foreground">
                <GraduationCap className="inline-block h-3 w-3 mr-1" />
                <span className={hasSemesterMatch ? "font-medium text-primary" : ""}>
                  Semestre {suggestion.semester}
                  {hasSemesterMatch && 
                    <Badge variant="outline" className="ml-1 bg-primary/10 text-primary text-[10px] py-0 h-4">
                      Coincide
                    </Badge>
                  }
                </span>
              </div>
            )}
          </div>
          {suggestion.mutual_friends_count > 0 && (
            <div className="text-xs text-muted-foreground flex items-center">
              <Users className="inline-block h-3 w-3 mr-1" />
              {suggestion.mutual_friends_count} seguidores en común
            </div>
          )}
        </div>
      </Link>
      <FollowButton 
        targetUserId={suggestion.id}
        size="sm"
        batchFollowingStatus={batchFollowingStatus}
        onBatchFollowingUpdate={onBatchFollowingUpdate}
      />
    </div>
  );
}
