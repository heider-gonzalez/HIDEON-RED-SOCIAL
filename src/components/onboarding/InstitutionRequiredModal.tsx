import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, GraduationCap } from "lucide-react";

type InstitutionOption = { id: string; name: string };

interface InstitutionRequiredModalProps {
  open: boolean;
  onComplete: (payload: { institutionId: string; institutionName: string }) => void;
  initialInstitutionId?: string;
  initialOtherInstitutionName?: string;
}

export function InstitutionRequiredModal({
  open,
  onComplete,
  initialInstitutionId,
  initialOtherInstitutionName,
}: InstitutionRequiredModalProps) {
  const options: InstitutionOption[] = useMemo(
    () => [
      { id: "uninorte", name: "Universidad del Norte (Uninorte)" },
      { id: "uniatlantico", name: "Universidad del Atlántico" },
      { id: "cuc", name: "Universidad de la Costa (CUC)" },
      { id: "unireformada", name: "Corporación Universitaria Reformada" },
      { id: "unisimon", name: "Universidad Simón Bolívar" },
      { id: "uac", name: "Universidad Autónoma del Caribe" },
      { id: "unilibre", name: "Universidad Libre Seccional Barranquilla" },
      { id: "americana", name: "Corporación Universitaria Americana" },
      { id: "unimet", name: "Universidad Metropolitana" },
      { id: "iub", name: "Institución Universitaria de Barranquilla (IUB)" },
      { id: "unipau", name: "Corporación Universitaria Rafael Núñez" },
      { id: "itpca", name: "Politécnico Costa Atlántica" },
      { id: "sanmartin", name: "Fundación Universitaria San Martín" },
      { id: "uniminuto", name: "UNIMINUTO Sede Barranquilla" },
      { id: "fbc", name: "Fundación Bolivariana de Colombia" },
      { id: "sena", name: "SENA (Nodos Barranquilla)" },
      { id: "otros", name: "Otra (No listada)" },
    ],
    []
  );

  const [institutionId, setInstitutionId] = useState<string>(initialInstitutionId || "");
  const [otherInstitutionName, setOtherInstitutionName] = useState<string>(initialOtherInstitutionName || "");
  const [comboOpen, setComboOpen] = useState(false);

  const selected = options.find((o) => o.id === institutionId) || null;
  const needsOtherName = institutionId === "otros";

  const canContinue = Boolean(institutionId) && (!needsOtherName || Boolean(otherInstitutionName.trim()));

  const handleContinue = () => {
    if (!canContinue) return;

    const finalName = needsOtherName
      ? otherInstitutionName.trim()
      : selected?.name || "";

    onComplete({
      institutionId,
      institutionName: finalName,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Selecciona tu institución</DialogTitle>
          <DialogDescription className="text-center">
            Esto nos ayuda a conectarte con estudiantes y proyectos de tu comunidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Institución</label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between"
                >
                  <span className={cn("truncate", !selected && "text-muted-foreground")}>
                    {selected ? selected.name : "Busca y selecciona tu institución"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar institución..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                    <CommandGroup>
                      {options.map((opt) => (
                        <CommandItem
                          key={opt.id}
                          value={opt.name}
                          onSelect={() => {
                            setInstitutionId(opt.id);
                            if (opt.id !== "otros") setOtherInstitutionName("");
                            setComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              institutionId === opt.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{opt.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {needsOtherName && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Escribe el nombre de tu institución</label>
              <Input
                value={otherInstitutionName}
                onChange={(e) => setOtherInstitutionName(e.target.value)}
                placeholder="Ej: Universidad Nacional"
              />
            </div>
          )}
        </div>

        <Button className="w-full" onClick={handleContinue} disabled={!canContinue}>
          Continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
