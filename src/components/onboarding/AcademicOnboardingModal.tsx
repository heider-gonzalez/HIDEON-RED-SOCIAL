import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { careers } from "@/data/careers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Sparkles } from "lucide-react";

interface AcademicOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function AcademicOnboardingModal({ 
  open, 
  onComplete, 
  onSkip 
}: AcademicOnboardingModalProps) {
  const [career, setCareer] = useState("");
  const [semester, setSemester] = useState("");
  const [gender, setGender] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [academicRole, setAcademicRole] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Egresado"];

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado");

      const { error } = await supabase
        .from('profiles')
        .update({
          career: career || null,
          semester: semester || null,
          gender: gender || null,
          institution_name: institutionName || null,
          academic_role: academicRole || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Listo",
        description: "Guardamos tu info. Puedes cambiarla cuando quieras.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            ¡Bienvenido a H Social! <Sparkles className="inline h-5 w-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-center">
            Si quieres, cuéntanos un poquito de ti. Es opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="institutionName" className="block text-sm font-medium mb-2">
              ¿De qué institución eres? <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <input
              id="institutionName"
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              disabled={loading}
              placeholder="Ej: Universidad Nacional"
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
          </div>

          <div>
            <label htmlFor="career" className="block text-sm font-medium mb-2">
              ¿Qué carrera estudias? <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <Select value={career} onValueChange={setCareer} disabled={loading}>
              <SelectTrigger id="career">
                <SelectValue placeholder="Selecciona tu carrera" />
              </SelectTrigger>
              <SelectContent>
                {careers.map((careerOption) => (
                  <SelectItem key={careerOption} value={careerOption}>
                    {careerOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="semester" className="block text-sm font-medium mb-2">
              ¿En qué semestre estás? <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <Select value={semester} onValueChange={setSemester} disabled={loading}>
              <SelectTrigger id="semester">
                <SelectValue placeholder="Selecciona tu semestre" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((semesterOption) => (
                  <SelectItem key={semesterOption} value={semesterOption}>
                    {semesterOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="academicRole" className="block text-sm font-medium mb-2">
              Tu rol académico <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <Select value={academicRole} onValueChange={setAcademicRole} disabled={loading}>
              <SelectTrigger id="academicRole">
                <SelectValue placeholder="Selecciona tu rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Estudiante</SelectItem>
                <SelectItem value="professor">Profesor</SelectItem>
                <SelectItem value="researcher">Investigador</SelectItem>
                <SelectItem value="graduate">Egresado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium mb-2">
              Género <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <Select value={gender} onValueChange={setGender} disabled={loading}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Selecciona tu género" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Femenino</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefiero no decir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleComplete} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={onSkip}
            disabled={loading}
            className="w-full"
          >
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
