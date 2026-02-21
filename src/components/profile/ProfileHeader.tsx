import { useState } from "react";
import { ProfileCover } from "./ProfileCover";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileActions } from "./ProfileActions";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
// Removed ChatDialog - using global chat only
import { FullScreenImage } from "@/components/profile/FullScreenImage";
import { useProfileHeart } from "@/hooks/use-profile-heart";
import { useIsMobile } from "@/hooks/use-mobile";
// Removed engagement components for performance
import { trackPremiumProfileView } from "@/lib/api/profile-viewers";
import { useEffect } from "react";
import type { Profile } from "@/pages/Profile";
import { supabase } from "@/integrations/supabase/client";
import { NameEditIndicator } from "./NameEditIndicator";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProfileHeaderProps {
  profile: Profile;
  currentUserId: string | null;
  onImageUpload: (type: 'avatar' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => Promise<string>;
  onProfileUpdate?: (profile: Profile) => void;
}

export function ProfileHeader({ profile, currentUserId, onImageUpload, onProfileUpdate }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{url: string, type: 'avatar' | 'cover'} | null>(null);
  const { hasGivenHeart, heartsCount, isLoading: heartLoading, toggleHeart } = useProfileHeart(profile.id);
  const isMobile = useIsMobile();
  const [currentExperience, setCurrentExperience] = useState<{ title: string; company_name: string } | null>(null);
  const [professional, setProfessional] = useState<{
    headline: string | null;
    city: string | null;
    work_mode: 'remote' | 'hybrid' | 'onsite' | null;
  } | null>(null);

  const isOwner = currentUserId === profile.id;

  // Track profile views for non-owners
  useEffect(() => {
    if (!isOwner && profile.id) {
      // Track both regular and premium profile views
      // Profile view tracking removed for performance
      trackPremiumProfileView(profile.id);
    }
  }, [profile.id, isOwner]);

  const handleProfileUpdate = (updatedProfile: Profile) => {
    onProfileUpdate?.(updatedProfile);
  };


  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    return onImageUpload('avatar', e);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    return onImageUpload('cover', e);
  };

  const openFullScreenAvatar = () => {
    if (profile.avatar_url) {
      setFullscreenImage({ url: profile.avatar_url, type: 'avatar' });
    }
  };

  const openFullScreenCover = () => {
    if (profile.cover_url) {
      setFullscreenImage({ url: profile.cover_url, type: 'cover' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadCurrentExperience = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('profile_experiences')
          .select('title, company_name, is_current, end_date')
          .eq('profile_id', profile.id)
          .order('is_current', { ascending: false })
          .order('end_date', { ascending: false })
          .limit(1);

        if (error) {
          const message = String((error as any)?.message || '');
          if (message.toLowerCase().includes('does not exist')) {
            return;
          }
          return;
        }

        const row = Array.isArray(data) ? data[0] : null;
        if (row && isMounted) {
          setCurrentExperience({
            title: String((row as any).title || ''),
            company_name: String((row as any).company_name || '')
          });
        }
      } catch {
        // ignore
      }
    };

    if (profile?.id) {
      loadCurrentExperience();
    }

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  useEffect(() => {
    let isMounted = true;
    const loadProfessional = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('profile_professional')
          .select('headline, city, work_mode')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (error) {
          const message = String((error as any)?.message || '');
          if (message.toLowerCase().includes('does not exist')) {
            return;
          }
          return;
        }

        if (isMounted) {
          setProfessional({
            headline: (data as any)?.headline ?? null,
            city: (data as any)?.city ?? null,
            work_mode: (data as any)?.work_mode ?? null,
          });
        }
      } catch {
        // ignore
      }
    };

    if (profile?.id) {
      loadProfessional();
    }

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  const headline = [currentExperience?.title || profile.academic_role, currentExperience?.company_name]
    .filter(Boolean)
    .join(" • ");

  const professionalHeadline = professional?.headline || headline;

  const workModeLabel =
    professional?.work_mode === 'remote'
      ? 'Remoto'
      : professional?.work_mode === 'hybrid'
        ? 'Híbrido'
        : professional?.work_mode === 'onsite'
          ? 'Presencial'
          : null;

  const locationLine = [workModeLabel, professional?.city].filter(Boolean).join(' • ') || null;

  const followingHref = `/followers?userId=${profile.id}&tab=following`;
  const followersHref = `/followers?userId=${profile.id}&tab=followers`;

  const portfolioHref = `/profile/${profile.id}?tab=portfolio`;

  const handleContact = () => {
    navigate(`/messages?user=${profile.id}`);
  };

  const handleCollaborate = () => {
    const toName = profile.username || 'Hola';
    const draft = `Hola ${toName}, vi tu perfil y me gustaría proponerte una colaboración. ¿Tienes 10 minutos para hablar?`;
    navigate(`/messages?user=${profile.id}&draft=${encodeURIComponent(draft)}`);
  };

  return (
    <>
      <ProfileCover 
        coverUrl={profile.cover_url}
        isOwner={isOwner}
        onUpload={handleCoverUpload}
        onOpenFullscreen={openFullScreenCover}
      />

      <div className={`relative px-2 md:px-6 profile-header`}>
        <div className={`flex ${isMobile ? 'flex-col' : 'items-end'} gap-4`}>
          <div className="-mt-[64px]">
            <ProfileAvatar
              avatarUrl={profile.avatar_url}
              username={profile.username}
              isOwner={isOwner}
              onUpload={handleAvatarUpload}
              onOpenFullscreen={openFullScreenAvatar}
            />
          </div>
          
          <div className="flex-1 mt-2 md:mt-0">
            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold">
                    {profile.username || "Usuario sin nombre"}
                  </h1>

                  {/* Indicador de nombre editado manualmente */}
                  <NameEditIndicator 
                    isManuallyEdited={(profile as any).name_manually_edited}
                    googleName={(profile as any).google_name}
                  />
                  
                </div>

                {profile.career && (
                  <p className="mt-1 text-base font-semibold text-foreground/90">
                    {profile.career}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-4 text-sm">
                  <Link to={followingHref} className="hover:underline">
                    <span className="font-bold">{profile.following_count}</span>{" "}
                    <span className="text-muted-foreground">Seguidos</span>
                  </Link>
                  <Link to={followersHref} className="hover:underline">
                    <span className="font-bold">{profile.followers_count}</span>{" "}
                    <span className="text-muted-foreground">Seguidores</span>
                  </Link>
                </div>

                {(headline || profile.institution_name) && (
                  <div className="mt-1 space-y-0.5">
                    {professionalHeadline && (
                      <p className="text-sm font-medium text-foreground/90">
                        {professionalHeadline}
                      </p>
                    )}
                    {locationLine && (
                      <p className="text-sm text-muted-foreground">
                        {locationLine}
                      </p>
                    )}
                    {profile.institution_name && (
                      <p className="text-sm text-muted-foreground">
                        {profile.institution_name}
                      </p>
                    )}
                  </div>
                )}

                {!isOwner && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" asChild>
                      <Link to={portfolioHref}>Ver portafolio</Link>
                    </Button>
                    <Button type="button" variant="outline" onClick={handleContact}>
                      Contactar
                    </Button>
                    <Button type="button" onClick={handleCollaborate}>
                      Proponer colaboración
                    </Button>
                  </div>
                )}
              </div>
              
              <ProfileActions
                isOwner={isOwner}
                profileId={profile.id}
                username={profile.username || undefined}
                avatarUrl={profile.avatar_url}
                hasGivenHeart={hasGivenHeart}
                heartLoading={heartLoading}
                currentUserId={currentUserId}
                onEditClick={() => setIsEditDialogOpen(true)}
                onMessageClick={() => {}}
                onToggleHeart={toggleHeart}
              />
            </div>
          </div>
        </div>
      </div>

      <ProfileEditDialog
        profile={profile}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={handleProfileUpdate}
      />

      {/* Chat removed - using global chat only */}

      {fullscreenImage && (
        <FullScreenImage
          isOpen={!!fullscreenImage}
          onClose={() => setFullscreenImage(null)}
          imageUrl={fullscreenImage.url}
          altText={fullscreenImage.type === 'avatar' ? `Foto de perfil de ${profile.username}` : 'Foto de portada'}
        />
      )}
    </>
  );
}
