import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostContentInput } from '@/components/post/PostContentInput';
import { AttachmentInput } from '@/components/media/AttachmentInput';
import { VisibilitySelector } from '@/components/post/VisibilitySelector';
import { PostTypeExtended } from './ModalPublicacionWebReducer';

interface ModalPublicacionWebContentProps {
  content: string;
  setContent: (content: string) => void;
  selectedFiles: File[];
  filePreviews: string[];
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  removeAllAttachments: () => void;
  visibility: 'public' | 'friends' | 'private';
  setVisibility: (visibility: 'public' | 'friends' | 'private') => void;
  selectedPostType: PostTypeExtended | null;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isEditing: boolean;
}

export function ModalPublicacionWebContent({
  content,
  setContent,
  selectedFiles,
  filePreviews,
  addAttachments,
  removeAttachment,
  removeAllAttachments,
  visibility,
  setVisibility,
  selectedPostType,
  textareaRef,
  isEditing,
}: ModalPublicacionWebContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {selectedPostType === null && (
        <PostContentInput
          content={content}
          setContent={setContent}
          textareaRef={textareaRef}
        />
      )}

      {selectedPostType === 'regular' && (
        <PostContentInput
          content={content}
          setContent={setContent}
          textareaRef={textareaRef}
        />
      )}

      {/* File attachments */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''} seleccionado{selectedFiles.length > 1 ? 's' : ''}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeAllAttachments}
              className="text-xs h-7"
            >
              Eliminar todos
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative">
                {file.type.startsWith('image/') ? (
                  <img
                    src={filePreviews[index] || ''}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                ) : file.type.startsWith('video/') ? (
                  <div className="relative w-full h-24 bg-black rounded-md overflow-hidden">
                    <video
                      src={filePreviews[index] || ''}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-1">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center">
                    <span className="text-xs text-center px-2">{file.name}</span>
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add more files */}
      {selectedFiles.length > 0 && selectedFiles.length < 10 && !isEditing && (
        <AttachmentInput
          type="image"
          onFileSelect={(e) => {
            const files = Array.from(e.target.files || []);
            addAttachments(files);
            e.target.value = '';
          }}
          accept="image/*,video/*"
          showLabel={true}
          label={`Agregar más (${selectedFiles.length}/10)`}
        />
      )}

      
      {/* Visibility selector */}
      <VisibilitySelector
        visibility={visibility}
        setVisibility={setVisibility}
      />
    </div>
  );
}
