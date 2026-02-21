import { PrivateMessages } from "@/components/chat/PrivateMessages";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Messages() {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pt-14 pb-16' : 'pt-16'}`}>
      <div className="w-full mx-auto py-4 md:py-6 px-0 md:px-4">
        <PrivateMessages />
      </div>
    </div>
  );
}
