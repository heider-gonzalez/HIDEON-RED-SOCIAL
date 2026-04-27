type Role = "admin" | "moderator";

type UserRolesResult = {
  userId: string;
  isAdmin: boolean;
  isModerator: boolean;
  isModeratorOrAdmin: boolean;
};

const memoryCache = new Map<string, UserRolesResult>();

function storageKey(userId: string) {
  return `hsocial:user_roles:${userId}`;
}

export function getCachedUserRoles(userId: string): UserRolesResult | null {
  const fromMemory = memoryCache.get(userId);
  if (fromMemory) return fromMemory;

  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserRolesResult;
    if (!parsed?.userId) return null;
    if (parsed.userId !== userId) return null;
    memoryCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedUserRoles(userId: string, roles: Omit<UserRolesResult, "userId">) {
  const payload: UserRolesResult = { userId, ...roles };
  memoryCache.set(userId, payload);
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearCachedUserRoles(userId?: string) {
  if (userId) {
    memoryCache.delete(userId);
    try {
      sessionStorage.removeItem(storageKey(userId));
    } catch {
      // ignore
    }
    return;
  }

  memoryCache.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("hsocial:user_roles:")) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
