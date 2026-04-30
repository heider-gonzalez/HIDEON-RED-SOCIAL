import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InstitutionCombobox } from '@/components/filters/InstitutionCombobox';
import { PROJECT_CATEGORIES } from '@/types/project';

type ProjectsFiltersSectionProps = {
  searchQuery: string;
  institutionName: string;
  selectedCategory: string;
  selectedStatus: string;
  onSearchChange: (value: string) => void;
  onInstitutionChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function ProjectsFiltersSection({
  searchQuery,
  institutionName,
  selectedCategory,
  selectedStatus,
  onSearchChange,
  onInstitutionChange,
  onCategoryChange,
  onStatusChange,
}: ProjectsFiltersSectionProps) {
  return (
    <div className="bg-white dark:bg-card border-b border-border text-foreground dark:text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 py-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Buscar proyectos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 rounded-full border-2 focus:border-blue-500 bg-gray-50 text-foreground"
            />
          </div>

          <div className="md:w-80">
            <InstitutionCombobox value={institutionName} onChange={onInstitutionChange} />
          </div>

          <div className="flex items-center gap-2 md:w-64">
            <Filter className="text-muted-foreground" size={20} />
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="rounded-lg border-2">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {PROJECT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 md:w-48">
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="rounded-lg border-2">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="in_progress">🚀 En Desarrollo</SelectItem>
                <SelectItem value="completed">✅ Completados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
