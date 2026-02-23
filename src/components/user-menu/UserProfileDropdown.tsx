
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, Check, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface UserProfileDropdownProps {
  username: string;
  avatarUrl: string | null;
  userId: string | null;
  isLoading: boolean;
}

export function UserProfileDropdown({ username, avatarUrl, userId, isLoading }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="py-3 px-4 border-b bg-white dark:bg-gray-900 [.tech_&]:bg-background">
        <div className="h-10 bg-muted animate-pulse rounded-full"></div>
      </div>
    );
  }

  const handleCreateProfile = () => {
    navigate("/auth?tab=register");
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border-b bg-white dark:bg-gray-900 [.tech_&]:bg-background"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex justify-between items-center rounded-none h-auto py-3 px-4 bg-white dark:bg-gray-900 [.tech_&]:bg-background"
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(userId ? `/profile/${userId}` : "/auth");
            }}
            title="Ver mi perfil"
          >
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={avatarUrl || undefined} alt={username || "Usuario"} />
              <AvatarFallback>{(username?.charAt(0) || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{username || "Usuario sin nombre"}</span>
          </div>
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 py-2 bg-white dark:bg-gray-900 [.tech_&]:bg-background">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Tus páginas y perfiles</h3>
        
        <div className="space-y-1">
          {/* Current User Profile */}
          <Button
            variant="ghost"
            className="w-full justify-between px-2 py-2 h-auto bg-white dark:bg-gray-900 [.tech_&]:bg-background"
          >
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={avatarUrl || undefined} alt={username || "Usuario"} />
                <AvatarFallback>{(username?.charAt(0) || "U").toUpperCase()}</AvatarFallback>
              </Avatar>
              <span>{username || "Usuario sin nombre"}</span>
            </div>
            <Check className="h-5 w-5 text-primary" />
          </Button>
          
          {/* Create Profile Button */}
          <Button
            variant="ghost"
            className="w-full justify-start px-2 py-2 h-auto bg-white dark:bg-gray-900 [.tech_&]:bg-background"
            onClick={handleCreateProfile}
          >
            <div className="flex items-center">
              <div className="h-10 w-10 mr-3 bg-muted rounded-full flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <span>Crear perfil</span>
            </div>
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
