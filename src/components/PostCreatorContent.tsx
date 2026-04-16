import React from 'react';
import { Card } from '@/components/ui/card';
import { PostContentInput } from '@/components/post/PostContentInput';
import { TextBackgroundPalette } from '@/components/post/TextBackgroundPalette';
import { AttachmentInput } from '@/components/media/AttachmentInput';
import type { PostCreatorState, PostCreatorAction } from './PostCreatorReducer';

interface PostCreatorContentProps {
  state: PostCreatorState;
  dispatch: React.Dispatch<PostCreatorAction>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  removeAllAttachments: () => void;
}

export function PostCreatorContent({
  state,
  dispatch,
  textareaRef,
  addAttachments,
  removeAttachment,
  removeAllAttachments,
}: PostCreatorContentProps) {
  return (
    <Card className="overflow-hidden w-full rounded-2xl border border-border/30 bg-card shadow-none transition-colors duration-200 ease-out hover:bg-muted/[0.18] dark:border-white/10 p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-full">
      {/* Regular post content */}
      {state.postType === 'regular' && (
        <>
          <PostContentInput
            content={state.content}
            setContent={(content) => dispatch({ type: 'SET_CONTENT', payload: content })}
            textareaRef={textareaRef}
            contentStyle={{
              isTextOnly: state.contentStyle.isTextOnly,
              backgroundKey: state.contentStyle.backgroundKey,
              textColor: state.contentStyle.textColor,
            }}
            onPasteFiles={addAttachments}
          />

          {state.selectedFiles.length === 0 && (
            <TextBackgroundPalette
              selectedBackground={state.contentStyle.backgroundKey}
              onBackgroundChange={(style) => dispatch({ type: 'SET_CONTENT_STYLE', payload: style })}
              disabled={state.selectedFiles.length > 0}
            />
          )}
        </>
      )}

      {/* File attachments preview */}
      {state.selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {state.selectedFiles.length} archivo{state.selectedFiles.length > 1 ? 's' : ''} seleccionado{state.selectedFiles.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={removeAllAttachments}
              className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
            >
              Eliminar todos
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {state.selectedFiles.map((file, index) => (
              <div key={`${file.name}-${file.size}-${file.type}`} className="relative">
                {file.type.startsWith('image/') ? (
                  <img
                    src={state.filePreviews[index] || ''}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                ) : file.type.startsWith('video/') ? (
                  <div className="relative w-full h-24 bg-gray-950 rounded-md overflow-hidden">
                    <video
                      src={state.filePreviews[index] || ''}
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
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add more files */}
      {state.selectedFiles.length > 0 && state.selectedFiles.length < 10 && (
        <AttachmentInput
          type="image"
          onFileSelect={(e) => {
            const files = Array.from(e.target.files || []);
            addAttachments(files);
            e.target.value = '';
          }}
          accept="image/*,video/*"
          showLabel={true}
          label={`Agregar más (${state.selectedFiles.length}/10)`}
        />
      )}

      {/* Idea form - TODO: Implement IdeaForm component */}
      {state.postType === 'idea' && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Idea Form</h3>
          <p className="text-sm text-muted-foreground">Idea form component to be implemented</p>
        </div>
      )}

      {/* Project form - TODO: Implement ProjectForm component */}
      {state.postType === 'proyecto' && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Project Form</h3>
          <p className="text-sm text-muted-foreground">Project form component to be implemented</p>
        </div>
      )}
    </Card>
  );
}
