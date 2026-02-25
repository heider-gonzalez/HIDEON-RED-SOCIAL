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
}: PostWrapperProps) {
  return (
    <Card 
      className={`overflow-hidden w-full rounded-2xl border border-border/30 bg-card shadow-none transition-colors duration-200 ease-out hover:bg-muted/[0.18] dark:border-white/10 ${isHidden ? 'opacity-70' : ''}`}
    >
      {children}
    </Card>
  );
}
