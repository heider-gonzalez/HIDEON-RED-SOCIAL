import { useEffect, useRef } from 'react';

export function useAutoResize<T extends HTMLTextAreaElement>(
  content: string,
  minHeight: number = 100,
  maxHeight: number = 300
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the new height
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // Set the new height
    textarea.style.height = `${newHeight}px`;
    
    // Enable scrolling if content exceeds maxHeight
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [content, minHeight, maxHeight]);

  return ref;
}