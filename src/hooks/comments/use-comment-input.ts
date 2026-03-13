
import { useEffect } from "react";
import { useCommentImage } from "./use-comment-image";
import { useCommentTextarea } from "./use-comment-textarea";
import { useCommentMentions } from "./use-comment-mentions";

export function useCommentInput({
  newComment,
  onNewCommentChange,
  replyTo,
  setCommentImage
}: {
  newComment: string;
  onNewCommentChange: (value: string) => void;
  replyTo: { id: string; username: string } | null;
  setCommentImage?: (file: File | null) => void;
}) {
  // Use the extracted image handling hook
  const {
    fileInputRef,
    imagePreview,
    handleImageChange,
    handleRemoveImage,
    handlePaste
  } = useCommentImage(setCommentImage);
  
  // Use the extracted mentions hook
  const {
    containerRef,
    mentionUsers,
    mentionListVisible,
    mentionPosition,
    mentionIndex,
    setMentionIndex,
    handleTextAreaChange,
    handleSelectMention,
    handleMentionClick,
    setupSelectionChangeListeners,
    insertMention,
    setMentionListVisible
  } = useCommentMentions(newComment, onNewCommentChange);
  
  // Use the extracted textarea hook
  const {
    textareaRef,
    handleKeyDown
  } = useCommentTextarea({
    replyTo,
    mentionListVisible,
    mentionUsers,
    mentionIndex,
    setMentionIndex,
    newComment,
    onNewCommentChange,
    insertMention,
    setMentionListVisible
  });
  
  // Setup selection change listeners for mentions
  useEffect(() => {
    const cleanup = setupSelectionChangeListeners(textareaRef);
    return () => {
      if (cleanup) cleanup();
    };
  }, [newComment]);
  
  // Clean up image previews when unmounting
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Wrapped method to provide the textareaRef
  const handleTextAreaChangeWrapped = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextAreaChange(e, textareaRef);
  };
  
  // Wrapped method to provide the textareaRef
  const handleMentionClickWrapped = () => {
    handleMentionClick(textareaRef);
  };

  return {
    textareaRef,
    containerRef,
    fileInputRef,
    imagePreview,
    mentionUsers,
    mentionListVisible,
    mentionPosition,
    mentionIndex,
    setMentionIndex,
    handleKeyDown,
    handleTextAreaChange: handleTextAreaChangeWrapped,
    handleSelectMention,
    handleMentionClick: handleMentionClickWrapped,
    handleImageChange,
    handleRemoveImage,
    handlePaste
  };
}
