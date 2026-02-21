
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Feed } from "@/components/feed/Feed";
import { Grid, Lightbulb, FolderKanban, Award, FileText } from "lucide-react";
import { PinnedProjectsSection } from "./PinnedProjectsSection";
import { ProfilePortfolio } from "./ProfilePortfolio";
import { ProfileBadges } from "./ProfileBadges";
import { ProfileStats } from "./ProfileStats";
import type { Profile } from "@/pages/Profile";
import { useSearchParams } from "react-router-dom";
import { ProfileAchievementsSection } from "./ProfileAchievementsSection";

interface ProfileContentProps {
  profileId: string;
  isOwner?: boolean;
  profile: Profile;
  followersCount: number;
  postsCount: number;
  followingCount: number;
}

export function ProfileContent({ 
  profileId, 
  isOwner = false, 
  profile,
  followersCount,
  postsCount,
  followingCount
}: ProfileContentProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const allowedTabs = new Set(["posts", "ideas", "projects", "portfolio", "achievements"]);
  const tabParam = searchParams.get("tab");
  const currentTab = tabParam && allowedTabs.has(tabParam) ? tabParam : "posts";

  return (
    <Tabs
      value={currentTab}
      className="w-full"
      onValueChange={(value) => {
        const next = new URLSearchParams(searchParams);
        if (value === "posts") next.delete("tab");
        else next.set("tab", value);
        setSearchParams(next, { replace: true });
      }}
    >
      <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0">
        <TabsTrigger 
          value="posts" 
          className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <Grid className="h-4 w-4" />
          <span className="hidden sm:inline">Publicaciones</span>
        </TabsTrigger>
        <TabsTrigger 
          value="ideas"
          className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <Lightbulb className="h-4 w-4" />
          <span className="hidden sm:inline">Ideas</span>
        </TabsTrigger>
        <TabsTrigger 
          value="projects"
          className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <FolderKanban className="h-4 w-4" />
          <span className="hidden sm:inline">Proyectos</span>
        </TabsTrigger>

        <TabsTrigger 
          value="portfolio"
          className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Portafolio</span>
        </TabsTrigger>

        <TabsTrigger 
          value="achievements"
          className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
        >
          <Award className="h-4 w-4" />
          <span className="hidden sm:inline">Logros</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="posts" className="mt-0">
        <Feed userId={profileId} />
      </TabsContent>
      
      <TabsContent value="ideas" className="mt-0">
        <Feed userId={profileId} />
      </TabsContent>
      
      <TabsContent value="projects" className="mt-0">
        <PinnedProjectsSection profileId={profileId} isOwner={isOwner} />
      </TabsContent>

      <TabsContent value="portfolio" className="mt-0">
        <ProfilePortfolio profile={profile} isOwner={isOwner} />
      </TabsContent>

      <TabsContent value="achievements" className="mt-0">
        <div className="space-y-4 py-4">
          <ProfileAchievementsSection profileId={profileId} isOwner={isOwner} />
          <ProfileBadges profile={profile} />
          <ProfileStats
            profile={profile}
            followersCount={followersCount}
            postsCount={postsCount}
            followingCount={followingCount}
          />
          <Card className="p-4">
            <ProfilePortfolio profile={profile} isOwner={isOwner} />
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

