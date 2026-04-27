
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Post as PostType } from "@/types/post";
import { ReportWithUser, ReportedPost } from "@/types/database/moderation.types";
import { getReportedPosts, getPostReports, handleReportedPost } from "@/lib/api/moderation";

// Import components
import ModerationHeader from "@/components/moderation/ModerationHeader";
import ReportedPostsList from "@/components/moderation/ReportedPostsList";
import PostView from "@/components/moderation/PostView";
import EmptyState from "@/components/moderation/EmptyState";
import LoadingState from "@/components/moderation/LoadingState";
import RestrictedAccess from "@/components/moderation/RestrictedAccess";
import { useUserRoles } from "@/hooks/use-user-roles";

const ModerationPage = () => {
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [postReports, setPostReports] = useState<ReportWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModerator, setIsModerator] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: roles, isLoading: rolesLoading } = useUserRoles();

  const checkModeratorStatus = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      navigate("/auth");
      return false;
    }

    return Boolean(roles?.isModeratorOrAdmin);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        if (rolesLoading) return;
        const isAllowed = await checkModeratorStatus();
        setIsModerator(isAllowed);
        
        if (isAllowed) {
          const posts = await getReportedPosts();
          // Explicitly cast posts to appropriate type
          setReportedPosts(posts as ReportedPost[]);
          
          if (posts.length > 0) {
            const firstPostId = (posts[0] as any).post_id;
            setSelectedPost(firstPostId);
            const reports = await getPostReports(firstPostId);
            setPostReports(reports);
          }
        }
      } catch (error) {
        console.error("Error loading moderation data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos de moderación",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [navigate, toast, rolesLoading, roles?.isModeratorOrAdmin]);

  const handleSelectPost = async (postId: string) => {
    try {
      setSelectedPost(postId);
      setLoading(true);
      const reports = await getPostReports(postId);
      setPostReports(reports);
    } catch (error) {
      console.error("Error loading post reports:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los reportes de esta publicación",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (!selectedPost) return;
    
    try {
      setLoading(true);
      await handleReportedPost(selectedPost, action);
      
      const posts = await getReportedPosts();
      // Explicitly cast to appropriate type
      setReportedPosts(posts as ReportedPost[]);
      
      if (posts.length > 0) {
        const postExists = posts.some((p: any) => p.post_id === selectedPost);
        if (!postExists) {
          const firstPostId = (posts[0] as any).post_id;
          setSelectedPost(firstPostId);
          const reports = await getPostReports(firstPostId);
          setPostReports(reports);
        }
      } else {
        setSelectedPost(null);
        setPostReports([]);
      }
      
      toast({
        title: "Acción completada",
        description: action === 'approve' 
          ? "Publicación aprobada y restaurada" 
          : action === 'reject'
            ? "Publicación rechazada y mantenida oculta"
            : "Publicación eliminada permanentemente",
      });
    } catch (error) {
      console.error(`Error ${action}ing post:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo ${
          action === 'approve' ? 'aprobar' : action === 'reject' ? 'rechazar' : 'eliminar'
        } la publicación`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isModerator) {
    return <RestrictedAccess />;
  }

  const selectedPostData = selectedPost
    ? reportedPosts.find(p => p.post_id === selectedPost)?.posts as unknown as PostType
    : null;

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <div className="flex-1 flex justify-center md:ml-[70px]">
        <main className="w-full max-w-6xl px-4 py-6 md:py-8 pb-20 md:pb-8">
          <ModerationHeader />

          {loading ? (
            <LoadingState />
          ) : reportedPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3">
                <ReportedPostsList 
                  reportedPosts={reportedPosts}
                  selectedPost={selectedPost}
                  onSelectPost={handleSelectPost}
                  isLoading={loading}
                />
              </div>

              <div className="md:col-span-9">
                {selectedPostData && (
                  <PostView 
                    post={selectedPostData} 
                    reports={postReports}
                    onAction={handleAction}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ModerationPage;
