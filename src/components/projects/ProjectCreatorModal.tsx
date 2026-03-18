import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FolderOpen, ArrowLeft, ArrowRight, Upload } from 'lucide-react';
import { ProjectBasicInfoStep } from './ProjectCreatorSteps/ProjectBasicInfoStep';
import { ProjectTechnicalStep } from './ProjectCreatorSteps/ProjectTechnicalStep';
import { ProjectContactStep } from './ProjectCreatorSteps/ProjectContactStep';
import { ProjectAdditionalStep } from './ProjectCreatorSteps/ProjectAdditionalStep';
import { useProjectCreator } from '@/hooks/use-project-creator';
import { toast } from '@/hooks/use-toast';

interface ProjectCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectCreatorModal({ open, onOpenChange }: ProjectCreatorModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { formData, updateFormData, resetForm, isSubmitting, submitProject, imageFile, setImageFile } = useProjectCreator();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const stepTitles = [
    'Información Básica',
    'Detalles Técnicos',
    'Información de Contacto',
    'Información Adicional'
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCancel = () => {
    resetForm();
    setCurrentStep(1);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    try {
      await submitProject();
      toast({
        title: "¡Proyecto creado exitosamente!",
        description: "Tu proyecto ha sido publicado y está disponible para la comunidad.",
      });
      handleCancel();
    } catch (error) {
      toast({
        title: "Error al crear el proyecto",
        description: "Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title && formData.description && formData.category;
      case 2:
        return formData.status;
      case 3:
        return formData.contact_email;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProjectBasicInfoStep
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 2:
        return (
          <ProjectTechnicalStep
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 3:
        return (
          <ProjectContactStep
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 4:
        return (
          <ProjectAdditionalStep
            formData={formData}
            updateFormData={updateFormData}
            imageFile={imageFile}
            setImageFile={setImageFile}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FolderOpen className="text-primary" size={24} />
            Crear Nuevo Proyecto
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Comparte tu proyecto universitario con la comunidad académica
          </p>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Paso {currentStep} de {totalSteps}</span>
            <span>{Math.round(progress)}% completado</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Title */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold">{stepTitles[currentStep - 1]}</h2>
        </div>

        {/* Step Content */}
        <div className="py-4">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Anterior
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
          </div>

          <div>
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Siguiente
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex items-center gap-2 bg-primary text-white"
              >
                <Upload size={16} />
                {isSubmitting ? 'Publicando...' : 'Publicar Proyecto'}
              </Button>
            )}
          </div>
        </div>
        <DialogDescription className="sr-only">Descripción del diálogo</DialogDescription>
</DialogContent>
    </Dialog>
  );
}