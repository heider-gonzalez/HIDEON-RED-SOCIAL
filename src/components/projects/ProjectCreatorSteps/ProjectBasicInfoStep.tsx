import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PROJECT_CATEGORIES, type ProjectFormData } from '@/types/project';

interface ProjectBasicInfoStepProps {
  formData: ProjectFormData;
  updateFormData: (updates: Partial<ProjectFormData>) => void;
}

const MOCK_PROFESSORS = [
  'Dr. Carlos Mendoza',
  'Dra. Ana López',
  'Prof. Miguel Rodríguez',
  'Ing. Jonathan Robledo',
  'Dra. Patricia Gómez',
  'Prof. Roberto Silva',
  'Otro'
];

export function ProjectBasicInfoStep({ formData, updateFormData }: ProjectBasicInfoStepProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Título del Proyecto *
        </Label>
        <Input
          id="title"
          placeholder="Ej: Sistema de Gestión Académica IA"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          className="w-full"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Descripción *
        </Label>
        <Textarea
          id="description"
          placeholder={`Contexto académico
¿Este proyecto hace parte de una materia, semillero, práctica o iniciativa personal?

Problema u objetivo
¿Qué necesidad busca resolver o qué objetivo tiene el proyecto?

Qué se ha desarrollado hasta ahora
Describe brevemente el avance actual (idea, prototipo, MVP, investigación, etc.).

Tecnologías / herramientas
Lenguajes, frameworks, software o metodologías utilizadas.

Estado del proyecto
En idea / En desarrollo / Finalizado.

Qué se busca ahora
Colaboradores, feedback, validación, difusión, apoyo económico, etc.`}
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Objectives */}
      <div className="space-y-2">
        <Label htmlFor="objectives" className="text-sm font-medium">
          Objetivos del Proyecto
        </Label>
        <Textarea
          id="objectives"
          placeholder="¿Cuáles son los objetivos y metas que buscas alcanzar con este proyecto?"
          value={formData.objectives}
          onChange={(e) => updateFormData({ objectives: e.target.value })}
          className="min-h-[100px] resize-none"
        />
      </div>

      {/* Category and Professor Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Categoría *</Label>
          <Select value={formData.category} onValueChange={(value) => updateFormData({ category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Profesor a Cargo</Label>
          <Select value={formData.professor} onValueChange={(value) => updateFormData({ professor: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un profesor" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_PROFESSORS.map((professor) => (
                <SelectItem key={professor} value={professor}>
                  {professor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Academic Project Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="space-y-1">
          <Label htmlFor="is_academic" className="text-sm font-medium cursor-pointer">
            🎓 Proyecto Académico/Universitario
          </Label>
          <p className="text-xs text-muted-foreground">
            Marca si este proyecto es parte de una materia, semillero, tesis o investigación académica
          </p>
        </div>
        <Switch
          id="is_academic"
          checked={formData.is_academic}
          onCheckedChange={(checked) => updateFormData({ is_academic: checked })}
        />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration" className="text-sm font-medium">
          Duración del Proyecto
        </Label>
        <Input
          id="duration"
          placeholder="Ej: 6 meses, 1 semestre. Enero - Junio 2025"
          value={formData.duration}
          onChange={(e) => updateFormData({ duration: e.target.value })}
          className="w-full"
        />
      </div>
    </div>
  );
}