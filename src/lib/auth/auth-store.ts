import type { Session, User } from '@supabase/supabase-js';

export type AuthSnapshot = {
  user: User | null;
  session: Session | null;
};

let snapshot: AuthSnapshot = {
  user: null,
  session: null,
};

export function setAuthSnapshot(next: AuthSnapshot) {
  snapshot = next;
}

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function getAuthUser(): User | null {
  return snapshot.user;
}

export function requireAuthUser(): User {
  const user = snapshot.user;
  if (!user) {
    throw new Error('No user logged in');
  }
  return user;
}
