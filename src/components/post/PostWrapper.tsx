import { Card } from "@/components/ui/card";

interface PostWrapperProps {
  children: React.ReactNode;
  isHidden?: boolean;
  isIdeaPost?: boolean;
  isPinned?: boolean;
}

export function PostWrapper({ 
  children,
  isHidden = false,
  isIdeaPost = false,
  isPinned = false,
}: PostWrapperProps) {
  return (
    <Card 
      className={`overflow-hidden w-full rounded-2xl border border-border/30 bg-card shadow-none transition-colors duration-200 ease-out hover:bg-muted/[0.18] dark:border-white/10 ${
        isHidden ? 'opacity-70' : ''
      } ${
        isIdeaPost 
          ? 'bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-purple-950/20 border-blue-200/60 dark:border-blue-800/40' 
          : ''
      }`}
    >
      {children}
    </Card>
  );
}
