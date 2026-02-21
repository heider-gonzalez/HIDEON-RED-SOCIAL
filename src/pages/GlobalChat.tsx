import { GlobalChat } from "@/components/chat/GlobalChat";
import { useIsMobile } from "@/hooks/use-mobile";

export default function GlobalChatPage() {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pt-14 pb-16' : 'pt-16'}`}>
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <GlobalChat />
      </div>
    </div>
  );
}
