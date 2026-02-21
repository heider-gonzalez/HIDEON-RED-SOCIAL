
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { NavigationLink } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

export function NavigationItem({ link, isActive }: { link: NavigationLink; isActive: boolean }) {
  const Icon = link.icon;
  const isMobile = useIsMobile();

  const handleClick = (e: React.MouseEvent) => {
    if (link.onClick) {
      e.preventDefault();
      link.onClick();
    }
  };

  return (
    <Link
      to={link.to}
      onClick={link.onClick ? handleClick : undefined}
      className={`flex items-center justify-center py-4 px-2 transition-colors relative ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
      aria-label={link.label}
    >
      <Icon strokeWidth={isActive ? 2 : 1.5} className="w-6 h-6" />
      {!link.hideLabel && !isMobile && <span className="ml-2">{link.label}</span>}
      {link.badge && (
        <Badge 
          variant={link.badgeVariant || "destructive"} 
          className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs px-2 py-0"
        >
          {link.badge}
        </Badge>
      )}
    </Link>
  );
}
