import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Componente de loading reutilizable
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]}`} />
    </div>
  );
};

// Componente de skeleton para contenido
export const ContentSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="animate-pulse">
      <div className="h-20 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Lazy loading de componentes pesados
export const LazyPricingSection = lazy(() => 
  import('@/components/pricing/PricingSection').then(module => ({
    default: module.PricingSection
  }))
);

// Wrapper para lazy loading con fallback
export const LazyWrapper = ({ children, fallback = <LoadingSpinner /> }: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// Lazy loading para componentes de feed (comentados hasta que existan)
// export const LazyPostCard = lazy(() => 
//   import('@/components/PostCard').then(module => ({
//     default: module.PostCard
//   }))
// );

// export const LazyFeed = lazy(() => 
//   import('@/components/feed/Feed').then(module => ({
//     default: module.Feed
//   }))
// );

// Lazy loading para modales (comentado hasta verificar exportación)
// export const LazyModalPublicacionWeb = lazy(() => 
//   import('@/components/ModalPublicacionWeb').then(module => ({
//     default: module.ModalPublicacionWeb
//   }))
// );
