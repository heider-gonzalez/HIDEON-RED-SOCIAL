import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackUserMilestone } from "@/lib/api/analytics";
import { Sparkles, Users, Target, Rocket } from "lucide-react";

interface OnboardingData {
  career: string;
  semester: string;
  interests: string[];
  bio: string;
  goals: string[];
}

interface OnboardingWizardProps {
  onComplete: () => void;
  institutionName?: string;
}

const INTERESTS_OPTIONS = [
  "Tecnología", "Emprendimiento", "Innovación", "Investigación",
  "Proyectos Sociales", "Arte y Diseño", "Deportes", "Música",
  "Sostenibilidad", "Inteligencia Artificial", "Marketing Digital",
  "Desarrollo Web", "Datos y Analytics", "Robótica"
];

const GOALS_OPTIONS = [
  "Encontrar socios para proyectos", "Crear mi propia startup",
  "Conectar con otros estudiantes", "Desarrollar habilidades",
  "Participar en investigación", "Encontrar prácticas profesionales",
  "Crear contenido", "Aprender de otros"
];

export function OnboardingWizard({ onComplete, institutionName }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    career: "",
    semester: "",
    interests: [],
    bio: "",
    goals: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(prev => prev + 1);
      trackUserMilestone('onboarding_step_completed', { step });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleGoalToggle = (goal: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Update profile with onboarding data
      const { error } = await supabase
        .from('profiles')
        .update({
          career: data.career,
          semester: data.semester,
          bio: data.bio,
          interests: data.interests,
          goals: data.goals,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Track completion
      await trackUserMilestone('onboarding_completed', {
        career: data.career,
        semester: data.semester,
        interests_count: data.interests.length,
        goals_count: data.goals.length,
        institution: institutionName
      });

      toast({
        title: "¡Bienvenido!",
        description: "Tu perfil quedó listo. Tómalo con calma y disfruta la comunidad."
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo completar el registro. Inténtalo de nuevo."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="text-xl font-semibold">¡Comencemos!</h3>
              <p className="text-muted-foreground">Cuéntanos sobre tu formación académica</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="career">Programa académico</Label>
              <Input
                id="career"
                placeholder="Ej: Tecnología en Análisis y Desarrollo de Sistemas"
                value={data.career}
                onChange={(e) => setData(prev => ({ ...prev, career: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="semester">Semestre/Nivel</Label>
              <Select value={data.semester} onValueChange={(value) => setData(prev => ({ ...prev, semester: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu semestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1er Semestre</SelectItem>
                  <SelectItem value="2">2do Semestre</SelectItem>
                  <SelectItem value="3">3er Semestre</SelectItem>
                  <SelectItem value="4">4to Semestre</SelectItem>
                  <SelectItem value="5">5to Semestre</SelectItem>
                  <SelectItem value="6">6to Semestre</SelectItem>
                  <SelectItem value="egresado">Egresado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Target className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="text-xl font-semibold">Tus intereses</h3>
              <p className="text-muted-foreground">Selecciona los temas que más te apasionan</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS_OPTIONS.map((interest) => (
                <Button
                  key={interest}
                  variant={data.interests.includes(interest) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleInterestToggle(interest)}
                  className="justify-start"
                >
                  {interest}
                </Button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Rocket className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="text-xl font-semibold">Tus objetivos</h3>
              <p className="text-muted-foreground">¿Qué te gustaría encontrar por aquí?</p>
            </div>
            
            <div className="space-y-2">
              {GOALS_OPTIONS.map((goal) => (
                <Button
                  key={goal}
                  variant={data.goals.includes(goal) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGoalToggle(goal)}
                  className="w-full justify-start"
                >
                  {goal}
                </Button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Users className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="text-xl font-semibold">Preséntate</h3>
              <p className="text-muted-foreground">Cuéntale a la comunidad quién eres</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Biografía (opcional)</Label>
              <Textarea
                id="bio"
                placeholder="Ej: Estudiante apasionado por la tecnología y el emprendimiento. Me encanta crear soluciones innovadoras y conectar con personas que comparten mi visión..."
                value={data.bio}
                onChange={(e) => setData(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg text-sm">
              <h4 className="font-medium mb-2">🚀 ¡Casi listo!</h4>
              <p className="text-muted-foreground">
                Después de esto puedes compartir algo, explorar proyectos y conocer gente.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.career.trim() && data.semester;
      case 2:
        return data.interests.length > 0;
      case 3:
        return data.goals.length > 0;
      case 4:
        return true; // Bio is optional
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Configuración de perfil</CardTitle>
          <span className="text-sm text-muted-foreground">
            {step} de {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="w-full" />
        {institutionName && (
          <CardDescription>
            Te estás uniendo desde: <span className="font-medium">{institutionName}</span>
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        {renderStep()}
        
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Anterior
          </Button>
          
          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? "Completando..." : "Completar registro"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}