
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/pages/Profile";
import type { ProfileTable } from "@/types/database/profile.types";
import { useToast } from "@/hooks/use-toast";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import { ProfileBasicInfo } from "./form/ProfileBasicInfo";
import { CareerSelect } from "./form/CareerSelect";
import { SemesterSelect } from "./form/SemesterSelect";
import { RelationshipStatusSelect } from "./form/RelationshipStatusSelect";
import { ProfileAudioSection } from "./ProfileAudioSection";
import { formSchema, type ProfileFormValues } from "./form/profileSchema";

interface ProfileEditDialogProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProfile: Profile) => void;
}

export function ProfileEditDialog({
  profile,
  isOpen,
  onClose,
  onUpdate,
}: ProfileEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const debug = import.meta.env.DEV;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: profile.username || "",
      bio: profile.bio || "",
      career: profile.career || "",
      semester: profile.semester || "",
      relationship_status: profile.relationship_status || "",
    },
  });

  // Actualizar el formulario cuando el perfil cambia
  useEffect(() => {
    form.reset({
      username: profile.username || "",
      bio: profile.bio || "",
      career: profile.career || "",
      semester: profile.semester || "",
      relationship_status: profile.relationship_status || "",
    });
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);

    try {
      // Verificar si el nombre de usuario cambió
      const nameChanged = values.username !== profile.username;
      
      if (nameChanged && values.username.trim()) {
        // Usar la función especial para marcar el nombre como editado manualmente
        const { error: nameError } = await supabase.rpc('mark_name_as_manually_edited', {
          p_user_id: profile.id,
          p_new_name: values.username.trim()
        });

        if (nameError) throw nameError;
      }

      // Actualizar los demás campos
      const updateData: any = {
        bio: values.bio || null,
        career: values.career || null,
        semester: values.semester || null,
        relationship_status: values.relationship_status || null,
        updated_at: new Date().toISOString(),
      };

      // Solo actualizar username si no cambió (para no duplicar la operación)
      if (!nameChanged) {
        updateData.username = values.username;
      }

      console.log("Enviando datos de actualización:", updateData);

      // Actualizar en Supabase
      const { data, error } = await (supabase as any)
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id)
        .select()
        .single();

      console.log("Respuesta de Supabase:", { data, error });

      if (error) {
        console.error("Error específico de Supabase:", error);
        throw error;
      }

      if (data) {
        console.log("Datos recibidos de Supabase:", data);
        
        const profileData = data as unknown as ProfileTable['Row'];
        const updatedProfile: Profile = {
          ...profile,
          username: values.username, // Usar el valor del formulario
          bio: profileData.bio,
          updated_at: profileData.updated_at,
          career: profileData.career,
          semester: profileData.semester,
          birth_date: profileData.birth_date,
          relationship_status: profileData.relationship_status
        };
        
        console.log("Perfil actualizado localmente:", updatedProfile);
        onUpdate(updatedProfile);
        
        // Invalidate profile queries para forzar recarga
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
        queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
        
        toast({
          title: "Perfil actualizado",
          description: nameChanged 
            ? "Tu nombre ha sido actualizado y no será modificado por Google en el futuro"
            : "Los cambios han sido guardados exitosamente",
        });
        onClose();
      } else {
        console.error("No se recibieron datos de Supabase");
        throw new Error("No se recibieron datos de la base de datos");
      }
    } catch (error) {
      const message =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "No se pudo actualizar el perfil";
      const details =
        typeof (error as any)?.details === "string" ? (error as any).details : "";
      const hint = typeof (error as any)?.hint === "string" ? (error as any).hint : "";

      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: [message, details, hint].filter(Boolean).join(" · "),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-2">
            <ProfileBasicInfo form={form} />
            
            <CareerSelect form={form} />
            
            <SemesterSelect form={form} />
            
            <RelationshipStatusSelect form={form} />
            
            <ProfileAudioSection profile={profile} onProfileUpdate={onUpdate} />
            
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

