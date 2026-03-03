function getMinutesDiff(lastSeen: string | null): number | null {
  if (!lastSeen) return null;
  const lastSeenDate = new Date(lastSeen);
  const t = lastSeenDate.getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60));
}

export function isRecentlyOnline(lastSeen: string | null): boolean {
  const diffInMinutes = getMinutesDiff(lastSeen);
  if (diffInMinutes == null) return false;
  return diffInMinutes < 5;
}

// Label for contacts sidebar:
// - <5 min: "En línea"
// - <24h: "Activo hace X min" / "Activo hace X horas"
// - >=24h: "" (hide)
export function getRecentActivityLabel(lastSeen: string | null): string {
  const diffInMinutes = getMinutesDiff(lastSeen);
  if (diffInMinutes == null) return '';

  if (diffInMinutes < 5) return 'En línea';
  if (diffInMinutes < 60) return `Activo hace ${diffInMinutes} min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Activo hace ${diffInHours} horas`;

  return '';
}

// Backwards-compatible short formatter used in some places.
// Now hides stale activity (>24h) by returning empty string.
export function getTimeAgo(lastSeen: string | null): string {
  const diffInMinutes = getMinutesDiff(lastSeen);
  if (diffInMinutes == null) return '';

  if (diffInMinutes < 1) return 'ahora';
  if (diffInMinutes < 60) return `${diffInMinutes} min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  return '';
}

export function isUserOnline(status: string | null, lastSeen: string | null): boolean {
  if (status === 'online') return true;
  
  if (!lastSeen) return false;
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
  
  return diffInMinutes < 5; // Consider online if last seen within 5 minutes
}