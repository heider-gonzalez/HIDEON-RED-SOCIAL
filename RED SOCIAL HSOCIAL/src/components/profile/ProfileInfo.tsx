
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, CalendarDays, Heart, Briefcase, Sparkles, Plus, X, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Profile } from "@/pages/Profile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ProfileAudioPlayButton } from "./ProfileAudioPlayButton";


interface ProfileInfoProps {
  profile: Profile;
}

export function ProfileInfo({ profile }: ProfileInfoProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const isCompany = (profile as any)?.account_type === 'company';
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsTableAvailable, setSkillsTableAvailable] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const [experiences, setExperiences] = useState<
    Array<{
      id: string;
      title: string;
      company_name: string;
      location: string | null;
      start_date: string | null;
      end_date: string | null;
      is_current: boolean;
      description: string | null;
    }>
  >([]);
  const [experiencesTableAvailable, setExperiencesTableAvailable] = useState(true);
  const [expTitle, setExpTitle] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expStartDate, setExpStartDate] = useState<string>("");
  const [expEndDate, setExpEndDate] = useState<string>("");
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expDescription, setExpDescription] = useState("");
  const [isSavingExperience, setIsSavingExperience] = useState(false);
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMMM yyyy", { locale: es });
    } catch (error) {
      return "Fecha desconocida";
    }
  };

  const sortExperiences = (
    list: Array<{
      id: string;
      title: string;
      company_name: string;
      location: string | null;
      start_date: string | null;
      end_date: string | null;
      is_current: boolean;
      description: string | null;
    }>
  ) => {
    return [...list].sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      const aStart = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bStart = b.start_date ? new Date(b.start_date).getTime() : 0;
      return bStart - aStart;
    });
  };

  const addExperience = async () => {
    if (!experiencesTableAvailable) return;
    if (!isOwner) return;
    if (isSavingExperience) return;

    const title = expTitle.trim();
    const company_name = expCompany.trim();
    if (!title || !company_name) return;

    const payload = {
      profile_id: profile.id,
      title,
      company_name,
      location: expLocation.trim() ? expLocation.trim() : null,
      start_date: expStartDate ? expStartDate : null,
      end_date: expIsCurrent ? null : (expEndDate ? expEndDate : null),
      is_current: expIsCurrent,
      description: expDescription.trim() ? expDescription.trim() : null,
    };

    const prev = experiences;
    setIsSavingExperience(true);

    try {
      if (payload.is_current) {
        const { error: currentUpdateError } = await (supabase as any)
          .from('profile_experiences')
          .update({ is_current: false })
          .eq('profile_id', profile.id)
          .eq('is_current', true);

        if (currentUpdateError) {
          toast({
            variant: 'destructive',
            title: 'No se pudo guardar',
            description: String((currentUpdateError as any)?.message || 'Error actualizando experiencia actual')
          });
          setExperiences(prev);
          return;
        }
      }

      const { data, error } = await (supabase as any)
        .from('profile_experiences')
        .insert(payload)
        .select('id, title, company_name, location, start_date, end_date, is_current, description')
        .single();

      if (error) {
        setExperiences(prev);
        toast({
          variant: 'destructive',
          title: 'No se pudo guardar la experiencia',
          description: String((error as any)?.message || 'Error guardando experiencia')
        });
        return;
      }

      const created = {
        id: String((data as any)?.id || ''),
        title: String((data as any)?.title || title),
        company_name: String((data as any)?.company_name || company_name),
        location: ((data as any)?.location ?? payload.location) as any,
        start_date: ((data as any)?.start_date ?? payload.start_date) as any,
        end_date: ((data as any)?.end_date ?? payload.end_date) as any,
        is_current: Boolean((data as any)?.is_current ?? payload.is_current),
        description: ((data as any)?.description ?? payload.description) as any,
      };

      setExperiences(sortExperiences([
        ...(payload.is_current ? prev.map((e) => ({ ...e, is_current: false })) : prev),
        created,
      ]));

      setExpTitle("");
      setExpCompany("");
      setExpLocation("");
      setExpStartDate("");
      setExpEndDate("");
      setExpIsCurrent(false);
      setExpDescription("");

      toast({
        title: 'Guardado',
        description: 'Tu experiencia se guardó correctamente.'
      });
    } catch {
      setExperiences(prev);
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar la experiencia',
        description: 'Ocurrió un error inesperado al guardar.'
      });
    } finally {
      setIsSavingExperience(false);
    }
  };

  const deleteExperience = async (experienceId: string) => {
    if (!experiencesTableAvailable) return;
    if (!isOwner) return;
    if (isSavingExperience) return;

    const prev = experiences;
    setIsSavingExperience(true);
    setExperiences(experiences.filter((e) => e.id !== experienceId));

    try {
      const { error } = await (supabase as any)
        .from('profile_experiences')
        .delete()
        .eq('id', experienceId)
        .eq('profile_id', profile.id);

      if (error) {
        setExperiences(prev);
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: String((error as any)?.message || 'Error eliminando experiencia')
        });
      }
    } catch {
      setExperiences(prev);
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar',
        description: 'Ocurrió un error inesperado al eliminar.'
      });
    } finally {
      setIsSavingExperience(false);
    }
  };

  const getRelationshipStatusLabel = (status: string | null) => {
    if (!status) return null;
    
    const statusLabels: Record<string, string> = {
      'soltero': 'Soltero/a',
      'en_relacion': 'En una relación',
      'casado': 'Casado/a',
      'es_complicado': 'Es complicado',
      'divorciado': 'Divorciado/a',
      'viudo': 'Viudo/a'
    };
    
    return statusLabels[status] || status;
  };

  const isOwner = currentUserId === profile.id;

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted) setCurrentUserId(user?.id || null);
      } catch {
        if (isMounted) setCurrentUserId(null);
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadExperiences = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('profile_experiences')
          .select('id, title, company_name, location, start_date, end_date, is_current, description')
          .eq('profile_id', profile.id)
          .order('is_current', { ascending: false })
          .order('start_date', { ascending: false });

        if (error) {
          const message = String((error as any)?.message || '');
          if (message.toLowerCase().includes('does not exist')) {
            if (isMounted) setExperiencesTableAvailable(false);
            return;
          }
          return;
        }

        if (isMounted) {
          setExperiencesTableAvailable(true);
          setExperiences((data || []).map((r: any) => ({
            id: String(r?.id || ''),
            title: String(r?.title || ''),
            company_name: String(r?.company_name || ''),
            location: (r?.location ?? null) as any,
            start_date: (r?.start_date ?? null) as any,
            end_date: (r?.end_date ?? null) as any,
            is_current: Boolean(r?.is_current),
            description: (r?.description ?? null) as any,
          })));
        }
      } catch {
        // ignore
      }
    };

    if (profile?.id) {
      loadExperiences();
    }

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  useEffect(() => {
    let isMounted = true;

    const loadSkills = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('profile_skills')
          .select('skill_name')
          .eq('profile_id', profile.id)
          .order('skill_name', { ascending: true });

        if (error) {
          const message = String((error as any)?.message || '');
          if (message.toLowerCase().includes('does not exist')) {
            if (isMounted) setSkillsTableAvailable(false);
            return;
          }
          return;
        }

        if (isMounted) setSkillsTableAvailable(true);

        const nextSkills = (data || [])
          .map((r: any) => String(r?.skill_name || '').trim())
          .filter(Boolean);

        if (isMounted) {
          setSkills(nextSkills);
        }
      } catch {
        // ignore
      }
    };

    if (profile?.id) {
      loadSkills();
    }

    return () => {
      isMounted = false;
    };
  }, [profile.id, isOwner]);

  const addSkill = async () => {
    if (!skillsTableAvailable) return;
    if (!isOwner) return;
    if (isSavingSkill) return;

    const next = skillInput.trim();
    if (!next) return;

    const nextLower = next.toLowerCase();
    const hasAlready = skills.some((s) => String(s).toLowerCase() === nextLower);
    if (hasAlready) {
      setSkillInput("");
      return;
    }

    const prevSkills = skills;
    const optimistic = [...skills, next].sort((a, b) => a.localeCompare(b));
    setSkills(optimistic);
    setSkillInput("");
    setIsSavingSkill(true);

    try {
      const { error } = await (supabase as any)
        .from('profile_skills')
        .insert({ profile_id: profile.id, skill_name: next });

      if (error) {
        const message = String((error as any)?.message || '');
        if (!message.toLowerCase().includes('duplicate') && !message.toLowerCase().includes('unique')) {
          setSkills(prevSkills);
        }

        toast({
          variant: 'destructive',
          title: 'No se pudo guardar la habilidad',
          description: message || 'Error guardando habilidad'
        });
        return;
      }

      toast({
        title: 'Guardado',
        description: 'Tu habilidad se guardó correctamente.'
      });
    } catch {
      setSkills(prevSkills);
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar la habilidad',
        description: 'Ocurrió un error inesperado al guardar.'
      });
    } finally {
      setIsSavingSkill(false);
    }
  };

  const removeSkill = async (skill: string) => {
    if (!skillsTableAvailable) return;
    if (!isOwner) return;
    if (isSavingSkill) return;

    const prevSkills = skills;
    setSkills(skills.filter((s) => s !== skill));
    setIsSavingSkill(true);

    try {
      const { error } = await (supabase as any)
        .from('profile_skills')
        .delete()
        .eq('profile_id', profile.id)
        .eq('skill_name', skill);

      if (error) {
        setSkills(prevSkills);
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: String((error as any)?.message || 'Error eliminando habilidad')
        });
      }
    } catch {
      setSkills(prevSkills);
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar',
        description: 'Ocurrió un error inesperado al eliminar.'
      });
    } finally {
      setIsSavingSkill(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="h-fit">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Acerca de</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {profile.bio || "Agrega una descripción profesional para que otros entiendan tu experiencia y qué estás buscando."}
            </p>
            {(profile as any).intro_audio_url && (profile as any).intro_audio_is_active && (
              <div className="pt-2">
                <ProfileAudioPlayButton 
                  audioUrl={(profile as any).intro_audio_url}
                  durationSeconds={(profile as any).intro_audio_duration_seconds}
                />
              </div>
            )}
          </div>

          <Separator />

          {!isCompany && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Habilidades</h3>
                </div>

                {isOwner && skillsTableAvailable && (
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Agregar habilidad (ej: React, Ventas B2B)"
                      disabled={isSavingSkill}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addSkill}
                      disabled={isSavingSkill || !skillInput.trim()}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs flex items-center gap-1">
                        <span>{skill}</span>
                        {isOwner && skillsTableAvailable && (
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            disabled={isSavingSkill}
                            className="ml-1 opacity-70 hover:opacity-100"
                            aria-label={`Eliminar habilidad ${skill}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isOwner
                        ? "Aún no has agregado habilidades. Escribe una y presiona el botón + para guardarla."
                        : "Este perfil aún no tiene habilidades registradas."}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isOwner ? "Agrega tus habilidades para mejorar tu perfil profesional." : "Habilidades del perfil."}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Experiencia</h3>
                </div>

            {isOwner && experiencesTableAvailable && (
              <div className="rounded-md border border-border/60 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Cargo</label>
                    <Input
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                      placeholder="Ej: Product Manager"
                      disabled={isSavingExperience}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Empresa</label>
                    <Input
                      value={expCompany}
                      onChange={(e) => setExpCompany(e.target.value)}
                      placeholder="Ej: Acme Inc."
                      disabled={isSavingExperience}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Ubicación (opcional)</label>
                    <Input
                      value={expLocation}
                      onChange={(e) => setExpLocation(e.target.value)}
                      placeholder="Ej: Bogotá, Colombia"
                      disabled={isSavingExperience}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Descripción (opcional)</label>
                    <Textarea
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      placeholder="Logros, responsabilidades, stack..."
                      disabled={isSavingExperience}
                      className="min-h-[42px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Inicio</label>
                    <Input
                      type="date"
                      value={expStartDate}
                      onChange={(e) => setExpStartDate(e.target.value)}
                      disabled={isSavingExperience}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fin</label>
                    <Input
                      type="date"
                      value={expEndDate}
                      onChange={(e) => setExpEndDate(e.target.value)}
                      disabled={isSavingExperience || expIsCurrent}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={expIsCurrent}
                      onCheckedChange={(v) => setExpIsCurrent(Boolean(v))}
                      disabled={isSavingExperience}
                    />
                    <span className="text-sm">Actual</span>
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addExperience}
                    disabled={isSavingExperience || !expTitle.trim() || !expCompany.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {experiencesTableAvailable && experiences.length > 0 ? (
              <div className="space-y-3">
                {experiences.map((exp) => (
                  <div key={exp.id} className="rounded-md border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{exp.title}</p>
                        <p className="text-sm text-muted-foreground">{exp.company_name}</p>
                        {(exp.location || exp.start_date || exp.end_date || exp.is_current) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {exp.location ? `${exp.location} • ` : ""}
                            {exp.start_date ? exp.start_date : ""}
                            {(exp.end_date || exp.is_current) ? " - " : ""}
                            {exp.is_current ? "Actual" : (exp.end_date ? exp.end_date : "")}
                          </p>
                        )}
                      </div>

                      {isOwner && experiencesTableAvailable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteExperience(exp.id)}
                          disabled={isSavingExperience}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isOwner
                  ? "Aún no has agregado experiencia. Completa el formulario y presiona el botón + para guardarla."
                  : "Este perfil aún no tiene experiencia registrada."}
              </p>
            )}
          </div>

              {(profile.career || profile.semester || profile.institution_name) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Educación</h3>
                    </div>
                    {profile.institution_name && (
                      <p className="text-sm text-muted-foreground">
                        {profile.institution_name}
                      </p>
                    )}
                    {profile.career && (
                      <p className="text-sm text-muted-foreground">
                        Carrera: {profile.career}
                      </p>
                    )}
                    {profile.semester && (
                      <p className="text-sm text-muted-foreground">
                        Semestre: {profile.semester}
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />
            </>
          )}

          <div className={`space-y-4 profile-info-grid ${isMobile ? 'grid-cols-1' : 'grid grid-cols-1'}`}>
            {!isCompany && profile.relationship_status && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Situación sentimental</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {getRelationshipStatusLabel(profile.relationship_status)}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Se unió</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {formatDate(profile.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
