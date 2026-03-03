
import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePostOptions } from "./hooks/use-post-options";
import { InterestMenuItems } from "./menu-items/InterestMenuItems";
import { VisibilityMenuItems } from "./menu-items/VisibilityMenuItems";
import { ReportMenuItem } from "./menu-items/ReportMenuItem";
import { DeleteMenuItem } from "./menu-items/DeleteMenuItem";
import { SavePostMenuItem } from "./menu-items/SavePostMenuItem";
import { CopyLinkMenuItem } from "./menu-items/CopyLinkMenuItem";
import { ReportDialog } from "./ReportDialog";
import { supabase } from "@/integrations/supabase/client";

interface PostOptionsMenuProps {
  postId: string;
  postUserId: string;
  isHidden?: boolean;
  onHideToggle?: () => void;
  isAuthor?: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
}

export function PostOptionsMenu({ 
  postId, 
  postUserId, 
  isHidden = false,
  onHideToggle,
  isAuthor = false,
  canDelete = false,
  onDelete
}: PostOptionsMenuProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setCurrentUserId(data.user?.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const {
    isLoading,
    open,
    setOpen,
    username,
    handleSetInterest,
    handleHidePost,
    handleHideUser,
    handleReportPost
  } = usePostOptions({
    postId,
    postUserId,
    isHidden,
    onHideToggle,
    onReportPost: () => setReportOpen(true)
  });

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Opciones de publicación"
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md z-[9999]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>Opciones</DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <SavePostMenuItem postId={postId} />
        <CopyLinkMenuItem postId={postId} />
        
        <DropdownMenuSeparator />
        
        {!isAuthor && (
          <InterestMenuItems onSetInterest={handleSetInterest} />
        )}
        
        <VisibilityMenuItems 
          isHidden={isHidden}
          username={username}
          onHidePost={handleHidePost}
          onHideUser={handleHideUser}
        />
        
        {canDelete && onDelete && (
          <DeleteMenuItem onDelete={onDelete} />
        )}
        
        <ReportMenuItem onReportPost={handleReportPost} />
      </DropdownMenuContent>
    </DropdownMenu>
    <ReportDialog
      postId={postId}
      userId={currentUserId}
      open={reportOpen}
      onOpenChange={setReportOpen}
    />
    </>
  );
}
