
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfileImage } from "@/hooks/use-profile-image";
import { ProfileLayout } from "@/components/profile/ProfileLayout";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileInfo } from "@/components/profile/ProfileInfo";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { PinnedProjectsSection } from "@/components/profile/PinnedProjectsSection";
import { ProfileProfessionalCard } from "@/components/profile/ProfileProfessionalCard";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQueryClient } from "@tanstack/react-query";
import type { ProfileTable } from "@/types/database/profile.types";

export type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  intro_audio_url?: string | null;
  intro_audio_duration_seconds?: number | null;
  intro_audio_is_active?: boolean;
  location: string | null;
  education: string | null;
  career: string | null;
  semester: string | null;
  birth_date: string | null;
  relationship_status: string | null;
  account_type?: string | null;
  company_name?: string | null;
  institution_name?: string | null;
  academic_role?: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  hearts_count: number;
  created_at: string;
  updated_at: string;
  last_seen?: string | null;
  status?: 'online' | 'offline' | 'away' | null;
};

export default function Profile() {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { handleImageUpload } = useProfileImage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const debug = import.meta.env.DEV;

  const handleProfileUpdate = (updatedProfile: Profile) => {
    console.log('Updating profile state:', updatedProfile);
    setProfile(updatedProfile);
    // Invalidate profile queries to refresh data on next load
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    // Also invalidate specific profile queries
    queryClient.invalidateQueries({ queryKey: ['profile', updatedProfile.id] });
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(false);

        console.log('Loading profile with ID from URL:', routeUserId);

        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        // Si no hay ID en la URL, usar el del usuario actual (para /profile sin parámetros)
        // Pero si hay ID, usarlo estrictamente
        const profileId = routeUserId || user?.id;
        
        if (!profileId) {
          setError(true);
          return;
        }

        // Ejecutar todas las consultas en paralelo para mejorar velocidad
        const [profileResult, followersResult, followingResult, postsResult, heartsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username, bio, avatar_url, cover_url, intro_audio_url, intro_audio_duration_seconds, intro_audio_is_active, career, semester, birth_date, relationship_status, account_type, company_name, institution_name, academic_role, created_at, updated_at, last_seen, status')
            .eq('id', profileId)
            .single(),
          // Seguidores: usuarios que siguen a este perfil (following_id = profileId)
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', profileId),
          // Seguidos: usuarios que este perfil sigue (follower_id = profileId)
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', profileId),
          // Posts: publicaciones de este usuario
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profileId),
          Promise.resolve({ count: 0, error: null })
        ]);

        const { data: profileData, error: profileError } = profileResult;
        const { count: followersCount, error: followersError } = followersResult;
        const { count: followingCount, error: followingError } = followingResult;
        const { count: postsCount, error: postsError } = postsResult;
        const { count: heartsCount, error: heartsError } = heartsResult;

        if (debug) {
          const profileDataAny = profileData as any;
          console.log('=== DEPURACIÓN PROFUNDA ===');
          console.log('Profile ID buscado:', profileId);
          console.log('Profile Error:', profileError);
          console.log('Profile Data crudo:', profileData);
          console.log('Profile Data keys:', profileDataAny ? Object.keys(profileDataAny) : 'No data');
          console.log('Career en profileData:', profileDataAny?.career ?? 'undefined');
          console.log('Semester en profileData:', profileDataAny?.semester ?? 'undefined');
          console.log('Tipo de profileData:', typeof profileData);
          console.log('========================');
        }

        // Si el perfil no existe, crearlo automáticamente para el usuario actual
        if (profileError && profileError.code === 'PGRST116' && user?.id === profileId) {
          console.log('Profile not found, creating profile for user:', user?.id);
          try {
            const { data: newProfileData, error: createError } = await (supabase as any)
              .from('profiles')
              .insert({
                id: user.id,
                username: user.email?.split('@')[0] || 'user',
                bio: null,
                avatar_url: user.user_metadata?.avatar_url || null,
                cover_url: null,
                career: null,
                semester: null,
                birth_date: null,
                relationship_status: null,
                account_type: 'person',
                company_name: null,
                institution_name: null,
                academic_role: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_seen: null,
                status: 'online'
              })
              .select()
              .single();

            if (!createError && newProfileData) {
              console.log('Profile created successfully:', newProfileData);
              // Usar el perfil recién creado
              const typedProfileData = newProfileData as unknown as ProfileTable['Row'];
              
              const newProfile: Profile = {
                id: typedProfileData.id,
                username: typedProfileData.username,
                bio: typedProfileData.bio,
                avatar_url: typedProfileData.avatar_url,
                cover_url: typedProfileData.cover_url,
                intro_audio_url: (typedProfileData as any)?.intro_audio_url ?? null,
                intro_audio_duration_seconds: (typedProfileData as any)?.intro_audio_duration_seconds ?? null,
                intro_audio_is_active: (typedProfileData as any)?.intro_audio_is_active ?? false,
                location: null, // Campo no existe en BD
                education: null, // Campo no existe en BD
                career: typedProfileData.career,
                semester: typedProfileData.semester,
                birth_date: typedProfileData.birth_date,
                relationship_status: typedProfileData.relationship_status,
                account_type: (typedProfileData as any)?.account_type ?? null,
                company_name: (typedProfileData as any)?.company_name ?? null,
                institution_name: typedProfileData.institution_name,
                academic_role: typedProfileData.academic_role,
                followers_count: followersCount || 0,
                following_count: followingCount || 0,
                posts_count: postsCount || 0,
                hearts_count: heartsCount || 0,
                created_at: typedProfileData.created_at,
                updated_at: typedProfileData.updated_at
              };

              console.log('Profile loaded successfully:', newProfile);
              setProfile(newProfile);
              setLoading(false);
              return;
            }
          } catch (createErr) {
            console.error('Error creating profile:', createErr);
          }
        }

        if (profileError || !profileData) {
          console.error('Error fetching profile:', profileError);
          setError(true);
          return;
        }

        if (followersError) {
          console.error('Error fetching followers:', followersError);
        }

        if (followingError) {
          console.error('Error fetching following:', followingError);
        }

        if (postsError) {
          console.error('Error fetching posts:', postsError);
        }

        if (heartsError) {
          console.error('Error fetching hearts:', heartsError);
        }

        const typedProfileData = profileData as unknown as ProfileTable['Row'];

        const accountType = (typedProfileData as any)?.account_type as string | null | undefined;

        if (accountType === 'company') {
          try {
            const { data: cmData } = await (supabase as any)
              .from('company_members')
              .select('companies:companies(id, slug)')
              .eq('user_id', profileId)
              .limit(1);

            const company = Array.isArray(cmData) ? cmData[0]?.companies : null;
            const slugOrId = company?.slug || company?.id;
            if (slugOrId) {
              navigate(`/companies/${slugOrId}`, { replace: true });
              return;
            }
          } catch {
            // ignore and fallback to rendering the profile page
          }
        }

        // Crear el objeto Profile con los datos obtenidos
        const newProfile: Profile = {
          id: typedProfileData.id,
          username: typedProfileData.username,
          bio: typedProfileData.bio,
          avatar_url: typedProfileData.avatar_url,
          cover_url: typedProfileData.cover_url,
          intro_audio_url: (typedProfileData as any)?.intro_audio_url ?? null,
          intro_audio_duration_seconds: (typedProfileData as any)?.intro_audio_duration_seconds ?? null,
          intro_audio_is_active: (typedProfileData as any)?.intro_audio_is_active ?? false,
          location: null, // Campo no existe en BD, mantener null
          education: null, // Campo no existe en BD, mantener null
          career: typedProfileData.career,
          semester: typedProfileData.semester,
          birth_date: typedProfileData.birth_date,
          relationship_status: typedProfileData.relationship_status,
          account_type: accountType ?? null,
          company_name: (typedProfileData as any)?.company_name ?? null,
          institution_name: typedProfileData.institution_name,
          academic_role: typedProfileData.academic_role,
          followers_count: followersCount || 0,
          following_count: followingCount || 0,
          posts_count: postsCount || 0,
          hearts_count: heartsCount || 0,
          created_at: typedProfileData.created_at,
          updated_at: typedProfileData.updated_at
        };

        console.log('Profile loaded successfully:', newProfile);
        console.log('Profile - Career value:', newProfile.career);
        console.log('Profile - Semester value:', newProfile.semester);
        console.log('Profile - All profile data:', JSON.stringify(newProfile, null, 2));
        setProfile(newProfile);
      } catch (err) {
        console.error('Error in loadProfile:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [routeUserId]);

  const onImageUpload = async (type: 'avatar' | 'cover', e: React.ChangeEvent<HTMLInputElement>): Promise<string> => {
    try {
      const url = await handleImageUpload(type, e);
      if (url && profile) {
        const updatedProfile = {
          ...profile,
          [type === 'avatar' ? 'avatar_url' : 'cover_url']: url
        };
        setProfile(updatedProfile);
        toast({
          title: "Imagen actualizada",
          description: `Tu foto de ${type === 'avatar' ? 'perfil' : 'portada'} ha sido actualizada exitosamente`,
        });
      }
      return url;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la imagen",
      });
      return '';
    }
  };

  return (
    <ProfileLayout isLoading={loading} error={error}>
      {profile && (
        <>
          <ProfileHeader
            profile={profile}
            currentUserId={currentUserId}
            onImageUpload={onImageUpload}
            onProfileUpdate={handleProfileUpdate}
          />
          <div className="space-y-4 px-2 sm:px-4 py-4">
            <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-3' : ''} gap-4`}>
              <div className={`${!isMobile ? 'md:col-span-1' : ''}`}>
                <ProfileProfessionalCard profile={profile} isOwner={currentUserId === profile.id} />
                <PinnedProjectsSection
                  profileId={profile.id}
                  isOwner={currentUserId === profile.id}
                />
                <ProfileInfo profile={profile} />
              </div>
              <div className={`${!isMobile ? 'md:col-span-2' : ''}`}>
                <ProfileContent 
                  profileId={profile.id} 
                  isOwner={currentUserId === profile.id}
                  profile={profile}
                  followersCount={profile.followers_count}
                  postsCount={profile.posts_count}
                  followingCount={profile.following_count}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </ProfileLayout>
  );
}
