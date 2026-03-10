import { supabaseAdmin } from "./supabase-admin";

type BotUser = {
  id: string;
  email: string | null;
  isBotMeta: boolean;
  deletedAt: string | null;
};

function isBotEmail(email: string | null | undefined) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  return e.includes(".bot@hsocial.local") || (e.endsWith("@hsocial.local") && e.includes(".bot@"));
}

async function listBotUsersIncludingDeleted(): Promise<BotUser[]> {
  const result: BotUser[] = [];

  let page = 1;
  const perPage = 1000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users || [];
    for (const u of users) {
      const email = u.email ?? null;
      const isBotMeta = Boolean((u.user_metadata as any)?.is_bot);

      if (isBotEmail(email) || isBotMeta) {
        result.push({
          id: u.id,
          email,
          isBotMeta,
          deletedAt: ((u as any)?.deleted_at as string | null) ?? null,
        });
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  result.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
  return result;
}

async function safeDelete(table: string, column: string, userId: string) {
  try {
    await (supabaseAdmin as any).from(table).delete().eq(column, userId);
  } catch {
    // ignore
  }
}

async function safeDeleteIn(table: string, column: string, userIds: string[]) {
  try {
    await (supabaseAdmin as any).from(table).delete().in(column, userIds);
  } catch {
    // ignore
  }
}

async function deletePostsByUserId(userId: string) {
  const { error } = await (supabaseAdmin as any).from("posts").delete().eq("user_id", userId);
  if (error) {
    console.error(`[purge] Failed deleting posts by user_id for ${userId}: ${error.message}`);
  }
}

async function deleteDepsByPostIds(table: string, postIds: string[], userId: string) {
  if (postIds.length === 0) return;
  try {
    const { error } = await (supabaseAdmin as any).from(table).delete().in("post_id", postIds);
    if (error) {
      console.error(`[purge] Failed deleting ${table} by post_id for ${userId}: ${error.message}`);
    }
  } catch (e: any) {
    console.error(`[purge] Failed deleting ${table} by post_id for ${userId}: ${String(e?.message || e)}`);
  }
}

async function safeUpdateNull(table: string, column: string, userId: string) {
  try {
    await (supabaseAdmin as any).from(table).update({ [column]: null }).eq(column, userId);
  } catch {
    // ignore
  }
}

async function removeMediaFromPosts(postIds: string[]) {
  if (postIds.length === 0) return;

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("posts")
      .select("id, media_url, media_urls")
      .in("id", postIds);

    if (error) return;

    const urls: string[] = [];
    for (const row of data || []) {
      if (row?.media_url) urls.push(String(row.media_url));
      if (Array.isArray(row?.media_urls)) {
        for (const u of row.media_urls) urls.push(String(u));
      }
    }

    const paths: string[] = [];
    for (const u of urls) {
      try {
        const url = new URL(u);
        const parts = url.pathname.split("/").filter(Boolean);
        const mediaIndex = parts.indexOf("media");
        if (mediaIndex >= 0 && mediaIndex + 1 < parts.length) {
          paths.push(parts.slice(mediaIndex + 1).join("/"));
        }
      } catch {
        // ignore
      }
    }

    const uniquePaths = Array.from(new Set(paths)).filter(Boolean);
    if (uniquePaths.length) {
      try {
        await supabaseAdmin.storage.from("media").remove(uniquePaths);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

async function purgeUserContent(userId: string) {
  // Delete/cleanup things that commonly keep content visible

  // Posts first: fetch ids, remove media, then delete posts
  let postIds: string[] = [];
  try {
    const { data } = await (supabaseAdmin as any).from("posts").select("id").eq("user_id", userId);
    postIds = (data || []).map((r: any) => String(r.id)).filter(Boolean);
  } catch {
    // ignore
  }

  await removeMediaFromPosts(postIds);

  // Remove dependencies on these posts (from other users too) to avoid FK blockers.
  // Best-effort: some installs may not have all these tables/columns.
  if (postIds.length) {
    // likes is critical due to likes_post_id_fkey
    await deleteDepsByPostIds("likes", postIds, userId);
    await deleteDepsByPostIds("reactions", postIds, userId);
    await deleteDepsByPostIds("saved_posts", postIds, userId);
    await deleteDepsByPostIds("comments", postIds, userId);
  }

  // Delete children
  await safeDelete("comments", "user_id", userId);
  await safeDelete("reactions", "user_id", userId);
  await safeDelete("saved_posts", "user_id", userId);
  await safeDelete("idea_participants", "user_id", userId);
  await safeDelete("project_joins", "user_id", userId);
  await safeDelete("pinned_projects", "user_id", userId);
  await safeDelete("user_subscriptions", "user_id", userId);
  await safeDelete("subscriptions", "user_id", userId);
  await safeDelete("premium_hearts", "user_id", userId);
  await safeDelete("daily_engagement", "user_id", userId);
  await safeDelete("engagement_hearts", "user_id", userId);
  await safeDelete("university_verifications", "user_id", userId);
  await safeDelete("push_subscriptions", "user_id", userId);

  // Notifications could reference sender/receiver
  await safeDelete("notifications", "sender_id", userId);
  await safeDelete("notifications", "receiver_id", userId);

  // Messaging
  await safeDelete("miembros_canal", "id_usuario", userId);
  await safeUpdateNull("mensajes", "id_autor", userId);
  await safeUpdateNull("canales", "created_by", userId);

  // Friendships (two columns)
  try {
    await (supabaseAdmin as any)
      .from("friendships")
      .delete()
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  } catch {
    // ignore
  }

  // Delete posts last
  if (postIds.length) {
    const { error } = await (supabaseAdmin as any).from("posts").delete().in("id", postIds);
    if (error) {
      console.error(`[purge] Failed deleting posts by ids for ${userId}: ${error.message}`);
    }
  }

  // Fallback: delete by user_id (handles cases where select returned partial ids)
  await deletePostsByUserId(userId);

  // Finally profile (if exists)
  await safeDelete("profiles", "id", userId);

  // Storage objects owned by user (best-effort)
  try {
    await (supabaseAdmin as any).schema("storage").from("objects").delete().eq("owner", userId);
  } catch {
    // ignore
  }
  try {
    await (supabaseAdmin as any).schema("storage").from("objects").delete().eq("owner_id", userId);
  } catch {
    // ignore
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const dryRun = !args.has("--execute");

  const explicitUserIds: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--user-id") {
      const v = String(argv[i + 1] || "").trim();
      if (v) explicitUserIds.push(v);
    }
  }

  const bots = await listBotUsersIncludingDeleted();
  const targets = Array.from(
    new Map(
      [...bots.map((b) => [b.id, b] as const), ...explicitUserIds.map((id) => [id, null] as const)],
    ).keys(),
  );

  console.log(`Found ${bots.length} bot users (including deleted)`);
  for (const b of bots) {
    console.log(`- ${b.id}  email=${b.email ?? ""}  meta.is_bot=${b.isBotMeta}  deleted_at=${b.deletedAt ?? ""}`);
  }

  if (explicitUserIds.length) {
    console.log(`\nExplicit user ids (${explicitUserIds.length})`);
    for (const id of explicitUserIds) {
      console.log(`- ${id}`);
    }
  }

  if (dryRun) {
    console.log("\nDry run mode. To execute purge, run with --execute");
    return;
  }

  console.log("\nPurging bot content...");

  let ok = 0;
  let fail = 0;

  for (const userId of targets) {
    try {
      await purgeUserContent(userId);
      ok += 1;
      const found = bots.find((b) => b.id === userId);
      console.log(`Purged: ${userId} ${found?.email ?? ""}`);
    } catch (e: any) {
      fail += 1;
      const found = bots.find((b) => b.id === userId);
      console.error(`Failed: ${userId} ${found?.email ?? ""} - ${String(e?.message || e)}`);
    }
  }

  console.log(`\nDone. purged=${ok} failed=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
