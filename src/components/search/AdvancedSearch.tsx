import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  X, 
  User, 
  GraduationCap, 
  Calendar,
  MapPin,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchFilters {
  query: string;
  career: string;
  semester: string;
  searchType: "users" | "all";
}

const CAREERS = [
  "Ingeniería de Sistemas",
  "Medicina",
  "Derecho", 
  "Administración",
  "Psicología",
  "Arquitectura",
  "Comunicación Social",
  "Contaduría",
  "Diseño Gráfico",
  "Enfermería"
];

const SEMESTERS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
];

export function AdvancedSearch({ isOpen, onClose }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    career: "",
    semester: "",
    searchType: "users"
  });
  
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const debouncedQuery = useDebounce(filters.query, 300);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (debouncedQuery.length >= 2 || filters.career || filters.semester) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, filters.career, filters.semester, filters.searchType]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('profiles')
        .select('id, username, google_name, bio, avatar_url, career, semester')
        .neq('id', user.id);

      // Apply text search
      const q = debouncedQuery.trim();
      if (q.length >= 2) {
        query = query.or(`username.ilike.%${q}%,google_name.ilike.%${q}%,bio.ilike.%${q}%`);
      }

      // Apply career filter
      if (filters.career) {
        query = query.eq('career', filters.career);
      }

      // Apply semester filter
      if (filters.semester) {
        query = query.eq('semester', filters.semester);
      }

      query = query.limit(20);

      const { data, error } = await query;

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo realizar la búsqueda"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      career: "",
      semester: "",
      searchType: "users"
    });
    setResults([]);
  };

  const hasActiveFilters = filters.career || filters.semester;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar personas..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch();
                  }
                }}
                className="pl-11 pr-4 h-11 rounded-full border border-border/50 bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Filtros"
                >
                  <Filter className="h-4 w-4" />
                  {hasActiveFilters && (
                    <span className="sr-only">
                      {[filters.career, filters.semester].filter(Boolean).length} filtros activos
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] p-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Carrera
                    </label>
                    <Select
                      value={filters.career}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, career: value }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAREERS.map((career) => (
                          <SelectItem key={career} value={career}>
                            {career}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Semestre
                    </label>
                    <Select
                      value={filters.semester}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, semester: value }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEMESTERS.map((semester) => (
                          <SelectItem key={semester} value={semester}>
                            Semestre {semester}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="w-full">
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {hasActiveFilters && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="h-6 rounded-full">
                {[filters.career, filters.semester].filter(Boolean).length} filtros
              </Badge>
            </div>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-muted-foreground">Buscando...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-3 space-y-2">
              {results.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleUserClick(user.id)}
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{user.username || "Usuario"}</div>
                    {user.bio && (
                      <div className="text-sm text-muted-foreground truncate">
                        {user.bio}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-1">
                      {user.career && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          {user.career}
                        </div>
                      )}
                      {user.semester && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Semestre {user.semester}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (filters.query.length >= 2 || hasActiveFilters) ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No se encontraron resultados</p>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>Escribe para buscar</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
