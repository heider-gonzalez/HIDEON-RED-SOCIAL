
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { careers } from "@/data/careers";
import { useState, useEffect } from "react";

interface CareerSelectProps {
  form: UseFormReturn<z.infer<any>>;
  disabled?: boolean;
  disabledReason?: string;
}

export function CareerSelect({ form, disabled, disabledReason }: CareerSelectProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCareer, setCustomCareer] = useState("");

  // Inicializar el estado cuando el componente se monta o el perfil cambia
  useEffect(() => {
    // Pequeño delay para asegurar que el formulario ya fue reseteado
    const timer = setTimeout(() => {
      const currentCareer = form.getValues("career");
      
      if (currentCareer) {
        // Verificar si la carrera actual está en el listado de carreras predefinidas
        const isPredefinedCareer = careers.includes(currentCareer);
        
        if (!isPredefinedCareer && currentCareer !== "none") {
          // Es una carrera personalizada, mostrar el campo de texto
          setShowCustomInput(true);
          setCustomCareer(currentCareer);
        } else {
          // Es una carrera predefinida o "none", usar el dropdown
          setShowCustomInput(false);
          setCustomCareer("");
        }
      }
    }, 50); // 50ms delay

    return () => clearTimeout(timer);
  }, [form]);

  const handleCareerChange = (value: string) => {
    if (disabled) return;
    if (value === "otra") {
      setShowCustomInput(true);
      form.setValue("career", customCareer || "");
    } else {
      setShowCustomInput(false);
      form.setValue("career", value);
      setCustomCareer("");
    }
  };

  const handleCustomCareerChange = (value: string) => {
    setCustomCareer(value);
    form.setValue("career", value);
  };

  return (
    <FormField
      control={form.control}
      name="career"
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor="career">Carrera</FormLabel>
          {!showCustomInput ? (
            <Select
              onValueChange={handleCareerChange}
              defaultValue={field.value}
              disabled={Boolean(disabled)}
            >
              <FormControl>
                <SelectTrigger id="career">
                  <SelectValue placeholder="Selecciona tu carrera" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {careers.map((careerOption) => (
                  <SelectItem key={careerOption} value={careerOption}>
                    {careerOption}
                  </SelectItem>
                ))}
                <SelectItem value="otra">Otra (especificar)</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              <FormControl>
                <Input
                  id="career"
                  placeholder="Escribe tu carrera o profesión"
                  value={customCareer}
                  onChange={(e) => handleCustomCareerChange(e.target.value)}
                  disabled={Boolean(disabled)}
                  onBlur={() => {
                    if (!customCareer.trim()) {
                      setShowCustomInput(false);
                      form.setValue("career", "");
                    }
                  }}
                />
              </FormControl>
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomCareer("");
                  form.setValue("career", "");
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Volver al listado
              </button>
            </div>
          )}
          {Boolean(disabled) && Boolean(disabledReason) && (
            <div className="text-xs text-muted-foreground">
              {disabledReason}
            </div>
          )}
          <FormDescription>
            Los usuarios podrán ver tu carrera en tu perfil y ranking
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
