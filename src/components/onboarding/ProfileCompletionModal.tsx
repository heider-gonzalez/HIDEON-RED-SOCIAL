import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, GraduationCap } from "lucide-react";
import { institutionsBarranquilla } from "@/data/institutions-barranquilla";

type InstitutionOption = { id: string; name: string };

interface ProfileCompletionModalProps {
  open: boolean;
  onComplete: (payload: { institutionId: string; institutionName: string; career: string }) => void;
  initialInstitutionId?: string;
  initialOtherInstitutionName?: string;
  initialCareer?: string;
}

export function ProfileCompletionModal({
  open,
  onComplete,
  initialInstitutionId,
  initialOtherInstitutionName,
  initialCareer,
}: ProfileCompletionModalProps) {
  const options: InstitutionOption[] = useMemo(() => {
    const base = institutionsBarranquilla
      .filter((i) => i.id !== "otros")
      .map((i) => ({ id: i.id, name: i.name }));

    return [...base, { id: "otros", name: "Otra (No listada)" }];
  }, []);

  const [institutionId, setInstitutionId] = useState<string>(initialInstitutionId || "");
  const [otherInstitutionName, setOtherInstitutionName] = useState<string>(initialOtherInstitutionName || "");
  const [career, setCareer] = useState<string>(initialCareer || "");
  const [comboOpen, setComboOpen] = useState(false);

  const selected = options.find((o) => o.id === institutionId) || null;
  const needsOtherName = institutionId === "otros";

  const canContinue =
    Boolean(institutionId) &&
    (!needsOtherName || Boolean(otherInstitutionName.trim())) &&
    Boolean(career.trim());

  const handleContinue = () => {
    if (!canContinue) return;

    const finalInstitutionName = needsOtherName
      ? otherInstitutionName.trim()
      : selected?.name || "";

    onComplete({
      institutionId,
      institutionName: finalInstitutionName,
      career: career.trim(),
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
          <DialogTitle className="text-center">Completa tu perfil</DialogTitle>
          <DialogDescription className="text-center">
            Necesitamos tu institución y tu carrera para conectarte con personas de tu comunidad.
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
                  aria-controls="profile-completion-institution-listbox"
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
                  <CommandList id="profile-completion-institution-listbox">
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

          <div className="space-y-2">
            <label className="block text-sm font-medium">Carrera</label>
            <Input
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              placeholder="Ej: Ingeniería de Sistemas"
            />
          </div>
        </div>

        <Button className="w-full" onClick={handleContinue} disabled={!canContinue}>
          Guardar y continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
