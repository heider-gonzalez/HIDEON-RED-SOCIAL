import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirstPostBadge } from '@/components/badges/FirstPostBadge';
import { PostTypeExtended } from './ModalPublicacionWebReducer';

interface ModalPublicacionWebHeaderProps {
  onClose: () => void;
  selectedPostType: PostTypeExtended | null;
  showPostTypeMenu: boolean;
  setShowPostTypeMenu: (show: boolean) => void;
  setShowTemplateSelector: (show: boolean) => void;
  showFirstPostBadge: boolean;
  isEditing: boolean;
}

export function ModalPublicacionWebHeader({
  onClose,
  selectedPostType,
  showPostTypeMenu,
  setShowPostTypeMenu,
  setShowTemplateSelector,
  showFirstPostBadge,
  isEditing,
}: ModalPublicacionWebHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Editar publicación' : 'Crear publicación'}
        </h2>
        {showFirstPostBadge && <FirstPostBadge isOpen={true} onClose={() => {}} />}
      </div>
      <div className="flex items-center gap-2">
        {selectedPostType && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplateSelector(true)}
          >
            Plantillas
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
