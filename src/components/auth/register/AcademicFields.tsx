
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback } from "react";

interface AcademicFieldsProps {
  career: string;
  setCareer: (career: string) => void;
  semester: string;
  setSemester: (semester: string) => void;
  loading: boolean;
  showCareerError?: boolean;
}

export function AcademicFields({
  career,
  setCareer,
  semester,
  setSemester,
  loading,
  showCareerError = false
}: AcademicFieldsProps) {
  // Lista de semestres para el selector
  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Egresado"];

  const handleCareerChange = useCallback((value: string) => {
    setCareer(value);
  }, [setCareer]);

  const handleSemesterChange = useCallback((value: string) => {
    setSemester(value);
  }, [setSemester]);

  return (
    <>
      <div>
        <label htmlFor="career" className="block text-sm font-medium mb-1">
          Carrera estudiada <span className="text-red-500">*</span>
        </label>
        <Input
          id="career"
          name="career"
          value={career}
          onChange={(e) => handleCareerChange(e.target.value)}
          placeholder="Ej: Ingeniería de Sistemas"
          disabled={loading}
          required
          className={showCareerError && !career.trim() ? "border-red-500 focus:ring-red-500" : ""}
        />
        {showCareerError && !career.trim() && (
          <p className="text-xs text-red-500 mt-1">La carrera es obligatoria</p>
        )}
      </div>
      
      <div>
        <label htmlFor="semester" className="block text-sm font-medium mb-1">
          Semestre actual
        </label>
        <Select 
          value={semester} 
          onValueChange={handleSemesterChange}
          disabled={loading} 
          name="semester"
        >
          <SelectTrigger id="semester" name="semester">
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
    </>
  );
}
