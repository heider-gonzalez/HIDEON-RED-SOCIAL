// 🚀 HOOK PREMIUM REMOVIDO - FUNCIÓN DESCARTADA
// Este archivo documenta la eliminación de funcionalidades premium
// Todas las referencias a premium/subscriptions han sido eliminadas

/*
⚠️ IMPORTANTE: FUNCIÓN DESCARTADA

Este hook y todas las funcionalidades relacionadas con premium/subscriptions
han sido eliminadas del proyecto según lo solicitado.

Funcionalidades eliminadas:
- usePremium() hook
- Subscriptions management
- Premium hearts system
- Premium features
- Subscription status checking

Motivo de eliminación:
- Las funcionalidades premium fueron descartadas del proyecto
- Se eliminan para simplificar la base de datos y el código
- Se eliminan referencias a tablas: subscriptions, premium_hearts, etc.

Alternativa:
- El sistema ahora opera sin funcionalidades premium
- Todos los usuarios tienen acceso a las mismas características
- Se mantiene un sistema más simple y mantenible

Si necesitas implementar un sistema diferente en el futuro,
considera usar una arquitectura más simple sin tablas complejas de premium.
*/

// Hook vacío que retorna valores por defecto para mantener compatibilidad
// Este será eliminado completamente después de la migración
export function usePremium() {
  console.warn('⚠️ usePremium() ha sido eliminado. Retornando valores por defecto.');
  
  return {
    isPremium: false, // Todos los usuarios ahora tienen el mismo acceso
    isLoading: false,
    error: null,
  };
}

// Funciones vacías para mantener compatibilidad temporal
export const premiumUtils = {
  checkPremiumStatus: () => false,
  upgradeToPremium: () => Promise.resolve(false),
  cancelPremium: () => Promise.resolve(false),
  getPremiumFeatures: () => [],
};

export default usePremium;
