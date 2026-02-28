import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { institutionsBarranquilla } from "@/data/institutions-barranquilla";

interface InstitutionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  includeAllOption?: boolean;
  allLabel?: string;
  className?: string;
}

export function InstitutionCombobox({
  value,
  onChange,
  includeAllOption = true,
  allLabel = "Todas las instituciones",
  className,
}: InstitutionComboboxProps) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const base = institutionsBarranquilla.map((o) => ({ value: o.name, label: o.name }));
    if (!includeAllOption) return base;
    return [{ value: "", label: allLabel }, ...base];
  }, [includeAllOption, allLabel]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls="institution-listbox"
          className={cn("w-full justify-between", className)}
        >
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel || allLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar institución..." />
          <CommandList id="institution-listbox">
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value || "__all__"}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
