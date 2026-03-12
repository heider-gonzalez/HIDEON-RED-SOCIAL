
import { useState } from "react";
import { useMentionSearch } from "./use-mention-search";
import { useMentionDetection } from "./use-mention-detection";
import { useMentionPosition } from "./use-mention-position";
import { MentionUser } from "./types";

export function useMentions() {
  const [mentionListVisible, setMentionListVisible] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [caretPosition, setCaretPosition] = useState<number | null>(null);
  
  const { mentionUsers, mentionSearch, setMentionSearch } = useMentionSearch();
  const { getMentionIndices } = useMentionDetection();
  const { mentionPosition, calculateMentionPosition } = useMentionPosition();

  // Handle text changes to detect mentions
  const handleTextChange = (
    text: string, 
    caretPos: number, 
    inputElement: HTMLTextAreaElement | HTMLInputElement
  ) => {
    // Always log caret position to help with debugging
    console.log("Current caret position:", caretPos);
    console.log("Current text:", text);
    
    const mentionIndices = getMentionIndices(text, caretPos);
    
    if (mentionIndices) {
      console.log("Mention detected:", mentionIndices.query);
      setMentionSearch(mentionIndices.query);
      setMentionListVisible(true);
      setCaretPosition(caretPos);
      setMentionIndex(-1); // Reset selection index when search changes
      
      // Calculate position of mention list
      calculateMentionPosition(inputElement, mentionIndices.start);
    } else {
      // Only hide the list if it's currently visible
      if (mentionListVisible) {
        console.log("Hiding mention list - no valid mention pattern");
        setMentionListVisible(false);
        setMentionSearch("");
      }
    }
  };

  // Insert selected mention into text
  const insertMention = (text: string, user: MentionUser) => {
    if (caretPosition === null) return text;
    
    const mentionIndices = getMentionIndices(text, caretPosition);
    if (!mentionIndices) return text;
    
    const before = text.substring(0, mentionIndices.start);
    const after = text.substring(mentionIndices.end);
    
    // Reset mention state
    setMentionListVisible(false);
    setMentionSearch("");
    setMentionIndex(-1);
    
    console.log("Inserting mention:", { 
      before, 
      user: user.username, 
      after
    });
    
    return `${before}@${user.username} ${after}`;
  };

  return {
    mentionUsers,
    mentionListVisible,
    mentionPosition,
    mentionIndex,
    setMentionIndex,
    handleTextChange,
    insertMention,
    setMentionListVisible
  };
}
