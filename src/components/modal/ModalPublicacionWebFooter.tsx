import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { PostTypeExtended } from './ModalPublicacionWebReducer';

interface ModalPublicacionWebFooterProps {
  isFormValid: boolean;
  isPublishing: boolean;
  effectivePublishing: boolean;
  selectedPostType: PostTypeExtended | null;
  handleSubmit: () => void;
}

export function ModalPublicacionWebFooter({
  isFormValid,
  isPublishing,
  effectivePublishing,
  selectedPostType,
  handleSubmit,
}: ModalPublicacionWebFooterProps) {
  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <button
        type="button"
        className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <Clock className="h-5 w-5" />
      </button>

      <Button
        type="submit"
        disabled={!isFormValid || effectivePublishing}
        className="ml-2 bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50 disabled:opacity-70"
        size="lg"
        onClick={handleSubmit}
      >
        {effectivePublishing ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {selectedPostType === 'proyecto' ? 'Actualizando...' : 'Publicando...'}
          </span>
        ) : (
          <span className="flex items-center">
            Publicar
            <span className="hidden sm:inline text-xs opacity-70 ml-2">Ctrl+Enter</span>
          </span>
        )}
      </Button>
    </div>
  );
}
