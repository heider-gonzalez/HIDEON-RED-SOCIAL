
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface MentionsTextProps {
  content: string;
  className?: string; // Added className as an optional prop
}

export function MentionsText({ content, className }: MentionsTextProps) {
  const [formattedContent, setFormattedContent] = useState<Array<string | JSX.Element>>([]);

  useEffect(() => {
    if (!content) {
      setFormattedContent([]);
      return;
    }

    const normalizedContent = content
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n");

    // Regex to detect mentions in the format @[username](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    
    // Function to split text and process mentions
    const processContent = () => {
      const parts: Array<string | JSX.Element> = [];
      let lastIndex = 0;
      let match;
      
      while ((match = mentionRegex.exec(normalizedContent)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
          parts.push(normalizedContent.substring(lastIndex, match.index));
        }
        
        // Extract username and userId
        const username = match[1];
        const userId = match[2];
        
        // Add mention component
        const key = `mention-${userId}-${match.index}`;
        parts.push(
          <Link
            key={key}
            to={`/profile/${userId}`}
            className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            @{username}
          </Link>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < normalizedContent.length) {
        parts.push(normalizedContent.substring(lastIndex));
      }
      
      // If no parts were created (no mentions found), just return the original content
      if (parts.length === 0) {
        return [normalizedContent];
      }
      
      return parts;
    };
    
    setFormattedContent(processContent());
  }, [content]);

  if (!content) return null;

  return (
    <span className={className}> {/* Apply the className prop here */}
      {formattedContent.map((part, index) => 
        typeof part === 'string' ? (
          <span key={index}>{part}</span>
        ) : (
          part
        )
      )}
    </span>
  );
}
