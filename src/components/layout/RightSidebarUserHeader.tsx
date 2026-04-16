import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserHeaderProps {
  title: string;
  count?: number;
  icon?: React.ReactNode;
}

export function UserHeader({ title, count, icon }: UserHeaderProps) {
  return (
    <div className="pb-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2 text-foreground/70">
          {icon}
          {title}
        </div>
        {count && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-600/10 text-violet-700 dark:text-violet-300 font-semibold">
            {count} en línea
          </span>
        )}
      </div>
    </div>
  );
}
