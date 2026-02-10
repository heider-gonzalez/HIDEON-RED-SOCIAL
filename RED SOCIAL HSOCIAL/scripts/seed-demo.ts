import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DEMO_FEED_ITEMS, type DemoFeedItem } from './demo-feed-items';

// SECURITY: This script is server-side only and uses environment variables
// API keys are never exposed to client-side code
// This file should never be imported or used in browser environments

function loadEnvFromFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, 'utf8');

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

const cwd = process.cwd();
loadEnvFromFile(path.join(cwd, 'supabase', '.env.local'));
loadEnvFromFile(path.join(cwd, 'supabase', '.env.local.txt'));
loadEnvFromFile(path.join(cwd, 'supabase', '.env'));
loadEnvFromFile(path.join(cwd, 'supabase', '.env.txt'));
loadEnvFromFile(path.join(cwd, '.env.local'));
loadEnvFromFile(path.join(cwd, '.env.local.txt'));
loadEnvFromFile(path.join(cwd, '.env'));
loadEnvFromFile(path.join(cwd, '.env.txt'));

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim();
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtMatch = rawServiceKey?.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
const SUPABASE_SERVICE_ROLE_KEY = (jwtMatch?.[0] ?? rawServiceKey)?.replace(/\s+/g, '');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set them in your shell before running.'
  );
}

const REQUIRED_SUPABASE_URL: string = SUPABASE_URL;
const REQUIRED_SUPABASE_SERVICE_ROLE_KEY: string = SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(REQUIRED_SUPABASE_URL, REQUIRED_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type BotSpec = {
  email: string;
  username: string;
  avatar_url?: string;
  career?: string;
  bot_label?: string;
  bot_style?: string;
};

type AuthAdminUser = {
  id: string;
  email?: string;
};

type AuthorAccount = {
  id: string;
  username: string;
};

function shuffleInPlace<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

async function getAllProfileAuthors(): Promise<AuthorAccount[]> {
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, username')
    .limit(1000);
  if (error) throw error;

  const rows = (data || []) as any[];
  return rows
    .map((r) => ({
      id: String(r?.id || ''),
      username: String(r?.username || 'Usuario'),
    }))
    .filter((a) => Boolean(a.id));
}

async function authAdminRequest<T>(pathname: string, init: RequestInit): Promise<T> {
  const url = `${REQUIRED_SUPABASE_URL}/auth/v1${pathname}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: REQUIRED_SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${REQUIRED_SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as any) : null;
  if (!res.ok) {
    const msg = data?.msg ?? data?.message ?? text ?? `HTTP ${res.status}`;
    const err = new Error(`Auth admin request failed (${res.status}): ${msg}`);
    (err as any).status = res.status;
    (err as any).body = data;
    throw err;
  }
  return data as T;
}

// Security: Ensure sensitive data is not logged or exposed
function sanitizeForLogging(obj: any): any {
  if (!obj) return obj;
  const sanitized = { ...obj };
  if (sanitized.apikey) sanitized.apikey = '[REDACTED]';
  if (sanitized.Authorization) sanitized.Authorization = '[REDACTED]';
  return sanitized;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const data = await authAdminRequest<{ users: AuthAdminUser[] }>(
    '/admin/users?page=1&per_page=1000',
    { method: 'GET' }
  );

  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user?.id ?? null;
}

async function ensureAuthUserAndBotProfile(bot: BotSpec): Promise<string> {
  const existingId = await findUserIdByEmail(bot.email);
  let userId = existingId;

  if (!userId) {
    const password = `Demo-${randomUUID()}-${randomUUID()}`;
    try {
      const data = await authAdminRequest<{ user: AuthAdminUser }>(
        '/admin/users',
        {
          method: 'POST',
          body: JSON.stringify({
            email: bot.email,
            password,
            email_confirm: true,
            user_metadata: {
              username: bot.username,
              avatar_url: bot.avatar_url,
              career: bot.career,
              academic_role: 'Cuenta de la Comunidad',
            },
          }),
        }
      );
      userId = data.user.id;
    } catch (err) {
      // Fallback: if user already exists, fetch id
      const fallbackId = await findUserIdByEmail(bot.email);
      if (!fallbackId) throw err;
      userId = fallbackId;
    }
  }

  // Ensure profile exists and mark as bot
  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      username: bot.username,
      avatar_url: bot.avatar_url ?? null,
      career: bot.career ?? null,
      is_bot: true,
      bot_label: bot.bot_label ?? null,
      bot_style: bot.bot_style ?? null,
      updated_at: new Date().toISOString(),
    } as any,
    { onConflict: 'id' }
  );

  if (upsertError) throw upsertError;
  return userId;
}

async function getFallbackUserIds(count: number): Promise<string[]> {
  const take = Math.max(1, Math.min(100, Math.floor(count || 1)));

  // Prefer bot accounts if available
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('is_bot', true)
      .limit(take);
    if (error) throw error;
    const ids = (data as any[])?.map((r) => String(r?.id)).filter(Boolean) as string[];
    if (ids.length > 0) return ids;
  } catch {
    // ignore
  }

  // Fallback: any profiles
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id')
    .limit(take);
  if (error) throw error;

  const ids = (data as any[])?.map((r) => String(r?.id)).filter(Boolean) as string[];
  if (ids.length === 0) {
    throw new Error('No profiles found to use as fallback for demo seeding. Create a real user first.');
  }
  return ids;
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

function extractAvatarUrl(authorRole: string): string | undefined {
  const match = authorRole.match(/avatar:\s*(https?:\/\/[^)\s]+)/i);
  return match?.[1];
}

function demoCategoryFromType(type: DemoFeedItem['tipo_publicacion']) {
  switch (type) {
    case 'idea_proyecto':
      return 'idea';
    case 'evento':
      return 'event';
    case 'meme':
      return 'meme';
    case 'tip_rapido':
      return 'tip';
    case 'pregunta':
      return 'question';
    case 'colaboracion':
      return 'collaboration';
    default:
      return 'post';
  }
}

function buildContent(item: DemoFeedItem): string {
  const tagsLine = item.tags.join(' ');
  return `${item.titulo}\n${item.contenido}\n\n${tagsLine}`;
}

async function resetDemoPosts() {
  const { error } = await supabase.from('posts').delete().eq('is_demo', true);
  if (error) {
    throw new Error(
      `Failed to reset demo posts. Did you apply the demo/bots migration? Original error: ${error.message}`
    );
  }
}

async function seedDemoPosts(items: DemoFeedItem[], authors: AuthorAccount[]) {
  const posts: any[] = items.map((item, idx) => {
    const author = authors[idx % authors.length];
    const userId = author.id;
    const createdAt = hoursAgoIso(2 + idx * 2);

    const common = {
      user_id: userId,
      visibility: 'public',
      content: buildContent(item),
      created_at: createdAt,
      updated_at: createdAt,
      is_demo: true,
      demo_category: demoCategoryFromType(item.tipo_publicacion),
      demo_source: 'seed',
      demo_readonly: true,
    };

    if (item.tipo_publicacion === 'idea_proyecto' || item.tipo_publicacion === 'colaboracion') {
      return {
        ...common,
        post_type: 'idea',
        idea: {
          title: item.titulo,
          description: item.contenido,
          tags: item.tags,
          participants: [
            {
              user_id: userId,
              username: author.username,
              profession: item.autor_rol,
              joined_at: createdAt,
            },
          ],
          needed_roles:
            item.tipo_publicacion === 'colaboracion'
              ? [
                  {
                    title: 'Colaborador/a',
                    description: 'Busco apoyo para llevar esta idea a producción',
                    commitment_level: 'medium',
                  },
                ]
              : [],
          project_phase: 'ideation',
          collaboration_type: 'remote',
        },
      };
    }

    return {
      ...common,
      post_type: 'regular',
    };
  });

  const { error } = await supabase.from('posts').insert(posts);
  if (error) throw error;
}

async function main() {
  const shouldReset = process.argv.includes('--reset');
  const desiredPostCount = 27;

  const uniqueAuthors = Array.from(new Set(DEMO_FEED_ITEMS.map((i) => i.autor_nombre)));
  const selectedAuthors = uniqueAuthors.slice(0, 10);
  const bots: BotSpec[] = selectedAuthors.map((name) => {
    const first = DEMO_FEED_ITEMS.find((i) => i.autor_nombre === name);
    const avatar_url = first ? extractAvatarUrl(first.autor_rol) : undefined;
    const bot_style = slugify(name);
    return {
      email: `bot-${bot_style}@hsocial.demo`,
      username: name,
      avatar_url,
      career: first?.autor_rol,
      bot_label: first?.autor_rol,
      bot_style,
    };
  });

  const botAccounts: Array<{ id: string; username: string }> = [];
  try {
    const ids = await Promise.all(bots.map(ensureAuthUserAndBotProfile));
    bots.forEach((b, idx) => {
      botAccounts.push({ id: ids[idx], username: b.username });
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('⚠️ Bot auth creation failed; falling back to an existing user for demo posts:', err);
    const fallbackUserIds = await getFallbackUserIds(selectedAuthors.length);
    selectedAuthors.forEach((a, idx) => {
      const id = fallbackUserIds[idx % fallbackUserIds.length];
      botAccounts.push({ id, username: a });
    });
  }

  const allProfiles = await getAllProfileAuthors();
  const authorById = new Map<string, AuthorAccount>();
  allProfiles.forEach((a) => authorById.set(a.id, a));
  botAccounts.forEach((b) => {
    authorById.set(String(b.id), { id: String(b.id), username: String(b.username || 'Usuario') });
  });

  const authorPool = shuffleInPlace(Array.from(authorById.values()));
  const itemsToSeed = DEMO_FEED_ITEMS.slice(0, desiredPostCount);
  const selectedAuthorPool = authorPool.slice(0, Math.max(1, Math.min(authorPool.length, itemsToSeed.length)));

  if (shouldReset) {
    await resetDemoPosts();
  }

  await seedDemoPosts(itemsToSeed, selectedAuthorPool);

  // eslint-disable-next-line no-console
  console.log('✅ Demo seed completed', { reset: shouldReset });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Demo seed failed:', err);
  process.exit(1);
});
