import { useRef } from 'react';

export function useDoubleClick(
  onSingleClick: () => void,
  onDoubleClick: () => void,
  delay: number = 300
): () => void {
  const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);

  const handleClick = () => {
    clickCount.current += 1;

    if (clickCount.current === 1) {
      clickTimeout.current = setTimeout(() => {
        onSingleClick();
        clickCount.current = 0;
      }, delay);
    } else if (clickCount.current === 2) {
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      onDoubleClick();
      clickCount.current = 0;
    }
  };

  return handleClick;
}
