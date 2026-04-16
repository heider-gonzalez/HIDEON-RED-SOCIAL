import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import React, { useState, useRef, useCallback, useEffect, RefObject } from "react";
import { Smile, AtSign } from "lucide-react";
import { useMentions } from "@/hooks/use-mentions";
import { MentionSuggestions } from "./MentionSuggestions";
import { ContentStyle, backgroundPresets } from "./TextBackgroundPalette";
import EmojiPicker from 'emoji-picker-react';

interface PostContentInputProps {
  content: string;
  setContent: (content: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  contentStyle?: ContentStyle;
  onCursorPositionChange?: (position: number) => void;
  onPasteFiles?: (files: File[]) => void;
}

const PostContentInput = React.memo(function PostContentInput({
  content,
  setContent,
  textareaRef,
  contentStyle,
  onCursorPositionChange,
  onPasteFiles
}: PostContentInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const {
    mentionUsers,
    mentionListVisible,
    mentionPosition,
    mentionIndex,
    setMentionIndex,
    handleTextChange,
    insertMention,
    setMentionListVisible
  } = useMentions();

  // Handle text change and cursor position
  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const caretPos = e.target.selectionStart;
    
    setContent(newContent);
    setCursorPosition(caretPos);
    onCursorPositionChange?.(caretPos);
    
    // Handle mentions
    if (textareaRef.current) {
      handleTextChange(newContent, caretPos, textareaRef.current);
    }
  };

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionListVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (mentionUsers[mentionIndex]) {
          const newContent = insertMention(content, mentionUsers[mentionIndex]);
          setContent(newContent);
          // Reset cursor position after mention insertion
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          });
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionListVisible(false);
      }
    }
  };

  // Handle mention selection
  const handleMentionSelect = (user: any) => {
    const newContent = insertMention(content, user);
    setContent(newContent);
    // Reset cursor position after mention insertion
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    });
  };

  // Insert emoji at cursor position
  const handleEmojiSelect = (emojiObject: any) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.slice(0, start) + emojiObject.emoji + content.slice(end);
      setContent(newContent);
      
      // Use requestAnimationFrame to avoid DOM conflicts
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const newPosition = start + emojiObject.emoji.length;
          // Safe selection range setting
          try {
            textareaRef.current.setSelectionRange(newPosition, newPosition);
            textareaRef.current.focus();
          } catch (e) {
            console.warn('Selection range setting failed:', e);
          }
        }
      });
    }
    setShowEmojiPicker(false);
  };

  // Insert @ symbol at cursor position
  const handleAtSignClick = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.slice(0, start) + '@' + content.slice(end);
      setContent(newContent);
      
      // Use requestAnimationFrame to avoid DOM conflicts
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const newPosition = start + 1;
          // Safe selection range setting
          try {
            textareaRef.current.setSelectionRange(newPosition, newPosition);
            textareaRef.current.focus();
            // Trigger mention detection
            handleTextChange(newContent, newPosition, textareaRef.current);
          } catch (e) {
            console.warn('Selection range setting failed:', e);
          }
        }
      });
    }
  };

  // Get background preset
  const backgroundPreset = backgroundPresets.find(p => p.key === contentStyle?.backgroundKey);
  
  // Dynamic styles based on content style
  const getTextareaStyles = () => {
    if (contentStyle?.isTextOnly && contentStyle.backgroundKey !== 'none') {
      // Facebook-style background with text overlay
      return {
        className: "min-h-[160px] resize-none border-0 text-center text-lg font-semibold px-6 py-6 text-white placeholder:text-white/70 focus-visible:ring-0 bg-transparent relative z-10",
        style: {
          background: 'transparent'
        }
      };
    }
    return {
      className: "min-h-[100px] resize-none border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0",
      style: {}
    };
  };

  const textareaStyles = getTextareaStyles();

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (!item.type?.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file) continue;
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'img';
      const name = `clipboard-${Date.now()}.${ext}`;
      imageFiles.push(new File([file], name, { type: file.type }));
    }

    if (imageFiles.length === 0) return;
    if (!onPasteFiles) return;

    e.preventDefault();
    onPasteFiles(imageFiles);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        {/* Background overlay for text-only posts */}
        {contentStyle?.isTextOnly && contentStyle.backgroundKey !== 'none' && backgroundPreset && (
          <div className={`absolute inset-0 rounded-lg ${backgroundPreset.gradient}`} />
        )}
        
        <Textarea
          ref={textareaRef}
          placeholder={contentStyle?.isTextOnly ? "Escribe algo inspirador..." : "¿Qué idea tienes en mente?"}
          value={content}
          onChange={handleTextAreaChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={textareaStyles.className}
          style={textareaStyles.style}
        />
        
        {/* Action buttons */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                type="button"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleAtSignClick}
            type="button"
            title="Mencionar usuario"
          >
            <AtSign className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mention suggestions */}
      <MentionSuggestions
        users={mentionUsers}
        selectedIndex={mentionIndex}
        position={mentionPosition}
        visible={mentionListVisible}
        onUserSelect={handleMentionSelect}
      />
    </div>
  );
});

export { PostContentInput };
export default PostContentInput;
