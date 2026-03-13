
import { Button } from "@/components/ui/button";
import { MentionSuggestions } from "@/components/mentions/MentionSuggestions";
import { useCommentInput } from "@/hooks/comments";
import { CommentTextarea } from "./input/CommentTextarea";
import { ReplyBadge } from "./input/ReplyBadge";
import { ImagePreview } from "./input/ImagePreview";
import { CommentInputHelper } from "./input/CommentInputHelper";
import { MentionButton } from "./input/MentionButton";
import { ImageButton } from "./input/ImageButton";
import { SubmitButton } from "./input/SubmitButton";

interface CommentInputProps {
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onSubmitComment: () => void;
  replyTo: { id: string; username: string } | null;
  onCancelReply: () => void;
  commentImage?: File | null;
  setCommentImage?: (file: File | null) => void;
  isSubmitting?: boolean;
}

export function CommentInput({ 
  newComment, 
  onNewCommentChange, 
  onSubmitComment, 
  replyTo,
  onCancelReply,
  commentImage,
  setCommentImage,
  isSubmitting = false
}: CommentInputProps) {
  const {
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
    handleTextAreaChange,
    handleSelectMention,
    handleMentionClick,
    handleImageChange,
    handleRemoveImage,
    handlePaste
  } = useCommentInput({
    newComment,
    onNewCommentChange,
    replyTo,
    setCommentImage
  });

  const handleKeyDownWithSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const shouldSubmit = handleKeyDown(e);
    if (shouldSubmit) {
      onSubmitComment();
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <ReplyBadge replyTo={replyTo} onCancelReply={onCancelReply} />
      
      <ImagePreview imagePreview={imagePreview} onRemoveImage={handleRemoveImage} />
      
      <div className="flex gap-2 flex-col">
        <div className="flex items-center gap-2 relative">
          <CommentTextarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextAreaChange}
            onKeyDown={handleKeyDownWithSubmit}
            onPaste={handlePaste}
            placeholder={replyTo ? `Escribe tu respuesta para ${replyTo.username}...` : "Escribe un comentario..."}
          />
          <SubmitButton 
            onClick={onSubmitComment} 
            disabled={!newComment.trim() && !commentImage}
            isLoading={isSubmitting}
          />
        </div>
        <CommentInputHelper>
          <MentionButton onClick={handleMentionClick} />
          <ImageButton 
            onImageChange={handleImageChange}
            fileInputRef={fileInputRef}
          />
        </CommentInputHelper>
      </div>
      
      <MentionSuggestions
        users={mentionUsers}
        isVisible={mentionListVisible}
        position={mentionPosition}
        selectedIndex={mentionIndex}
        onSelectUser={handleSelectMention}
        onSetIndex={setMentionIndex}
      />
    </div>
  );
}
