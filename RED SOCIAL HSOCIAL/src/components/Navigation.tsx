import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home, Shield, Settings } from 'lucide-react';

export function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { name: 'Inicio', path: '/home', icon: Home },
    { name: 'Moderación', path: '/moderation', icon: Shield },
    { name: 'Configuración', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="flex flex-col space-y-2 p-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Button
            key={item.path}
            asChild
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start',
              isActive ? 'bg-accent' : ''
            )}
          >
            <Link to={item.path} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

// También exportamos por defecto para mantener compatibilidad con importaciones existentes
export default Navigation;