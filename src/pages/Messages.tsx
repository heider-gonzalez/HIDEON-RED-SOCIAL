import { PrivateMessages } from "@/components/chat/PrivateMessages";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Messages() {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "bg-background" : "bg-background h-full"}>
      <div className="w-full mx-auto px-0 md:px-4">
        <PrivateMessages />
      </div>
    </div>
  );
}
