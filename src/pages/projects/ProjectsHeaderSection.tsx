import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ProjectsHeaderSectionProps = {
  onCreate: () => void;
};

export function ProjectsHeaderSection({ onCreate }: ProjectsHeaderSectionProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">Proyectos e Innovación</h1>
            <p className="text-lg opacity-90">Explora e inspírate con ideas innovadoras</p>
          </div>
          <Button
            onClick={onCreate}
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-6 py-3 rounded-full flex items-center gap-2 self-center lg:self-auto shadow-lg"
          >
            <Rocket size={20} className="text-blue-600" />
            Crear proyecto
          </Button>
        </div>
      </div>
    </div>
  );
}
