
import { useEffect, useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MenuHeader } from "./MenuHeader";
import { MenuOptions } from "./MenuOptions";
import { useUserProfile } from "./hooks/useUserProfile";
import { UserProfileDropdown } from "./UserProfileDropdown";

interface UserMenuProps {
  triggerClassName?: string;
  iconClassName?: string;
}

export function UserMenu({ triggerClassName, iconClassName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const { username, avatarUrl, userId, isLoading } = useUserProfile();
  const { toast } = useToast();

  const createProfileLink = () => {
    if (!userId) return "";
    
    const baseUrl = window.location.origin;
    return `${baseUrl}/profile/${userId}`;
  };
  
  const copyProfileLink = () => {
    const link = createProfileLink();
    navigator.clipboard.writeText(link);
    toast({
      title: "Enlace copiado",
      description: "Enlace a tu perfil copiado al portapapeles"
    });
  };

  const handleClose = () => setOpen(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openMenu = params.get('menu') === '1' || params.get('openMenu') === '1';
    if (openMenu) {
      setOpen(true);
      // Clean the URL so it doesn't keep reopening on navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('menu');
      url.searchParams.delete('openMenu');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName ?? "h-8 w-8 rounded-full"}
        >
          <Menu className={iconClassName ?? "h-4 w-4"} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-full sm:max-w-lg bg-background">
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <MenuHeader onClose={handleClose} />
          
          {/* User Profile Dropdown */}
          <UserProfileDropdown 
            username={username}
            avatarUrl={avatarUrl}
            userId={userId}
            isLoading={isLoading}
          />
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto py-2 bg-background">
            {/* Main Menu Options */}
            <MenuOptions 
              userId={userId} 
              onClose={handleClose} 
              onCopyProfileLink={copyProfileLink} 
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
