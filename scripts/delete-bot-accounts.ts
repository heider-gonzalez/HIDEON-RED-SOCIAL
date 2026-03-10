import { supabaseAdmin } from "./supabase-admin";

type BotUserRow = {
  id: string;
  email: string | null;
  isBotMeta: boolean;
};

function isBotEmail(email: string | null | undefined) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  return e.includes(".bot@hsocial.local") || e.endsWith("@hsocial.local") && e.includes(".bot@");
}

async function listBotUsers(): Promise<BotUserRow[]> {
  const result: BotUserRow[] = [];

  // Supabase Admin listUsers is paginated
  let page = 1;
  const perPage = 1000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users || [];
    for (const u of users) {
      // Skip already deleted/disabled users
      if ((u as any)?.deleted_at) continue;
      const email = u.email ?? null;
      const isBotMeta = Boolean((u.user_metadata as any)?.is_bot);

      if (isBotEmail(email) || isBotMeta) {
        result.push({ id: u.id, email, isBotMeta });
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return result;
}

async function deleteBotUser(userId: string, softDelete = false) {
  // Deletes Auth user; with ON DELETE CASCADE FKs, most related rows should cascade.
  // Some tables reference profiles or other entities; if something blocks, we will see an error.
  const { error } = await (supabaseAdmin.auth.admin as any).deleteUser(userId, softDelete);
  if (error) throw error;
}

async function cleanupUserDependencies(userId: string) {
  // Best-effort cleanup for tables that may block auth.users deletion.
  // We intentionally ignore errors (table may not exist in a given environment).

  const safeDeleteEq = async (table: string, column: string) => {
    try {
      await (supabaseAdmin as any).from(table).delete().eq(column, userId);
    } catch {
      // ignore
    }
  };

  const safeUpdateNullEq = async (table: string, column: string) => {
    try {
      await (supabaseAdmin as any).from(table).update({ [column]: null }).eq(column, userId);
    } catch {
      // ignore
    }
  };

  const safeDeleteEqInSchema = async (schema: string, table: string, column: string) => {
    try {
      await (supabaseAdmin as any).schema(schema).from(table).delete().eq(column, userId);
    } catch {
      // ignore
    }
  };

  // Messaging tables: canales.created_by has FK without ON DELETE action in migrations.
  await safeUpdateNullEq("canales", "created_by");
  await safeDeleteEq("miembros_canal", "id_usuario");
  await safeUpdateNullEq("mensajes", "id_autor");

  // Social graph & interactions
  try {
    await (supabaseAdmin as any)
      .from("friendships")
      .delete()
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  } catch {
    // ignore
  }

  await safeDeleteEq("reactions", "user_id");
  await safeDeleteEq("comment_reactions", "user_id");
  await safeDeleteEq("saved_posts", "user_id");
  await safeDeleteEq("notifications", "sender_id");
  await safeDeleteEq("notifications", "receiver_id");
  await safeDeleteEq("push_subscriptions", "user_id");

  // Posts/comments authored by the user (these should cascade in most schemas, but we force-delete)
  await safeDeleteEq("comments", "user_id");
  await safeDeleteEq("posts", "user_id");

  // Misc feature tables
  await safeDeleteEq("idea_participants", "user_id");
  await safeDeleteEq("project_joins", "user_id");
  await safeDeleteEq("pinned_projects", "user_id");
  await safeDeleteEq("user_subscriptions", "user_id");
  await safeDeleteEq("subscriptions", "user_id");
  await safeDeleteEq("premium_hearts", "user_id");
  await safeDeleteEq("daily_engagement", "user_id");
  await safeDeleteEq("engagement_hearts", "user_id");
  await safeDeleteEq("university_verifications", "user_id");

  // Supabase Storage can block auth.users deletion in some setups
  await safeDeleteEqInSchema("storage", "objects", "owner");
  await safeDeleteEqInSchema("storage", "objects", "owner_id");

  // Finally, try removing profile row explicitly
  await safeDeleteEq("profiles", "id");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = !args.has("--execute");

  const bots = await listBotUsers();
  bots.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));

  console.log(`Found ${bots.length} bot users`);
  for (const b of bots) {
    console.log(`- ${b.id}  email=${b.email ?? ""}  meta.is_bot=${b.isBotMeta}`);
  }

  if (dryRun) {
    console.log("\nDry run mode. To execute deletions, run with --execute");
    return;
  }

  console.log("\nExecuting deletions...");
  let ok = 0;
  let fail = 0;

  for (const b of bots) {
    try {
      await deleteBotUser(b.id);
      ok += 1;
      console.log(`Deleted: ${b.id} ${b.email ?? ""}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.error(`Failed: ${b.id} ${b.email ?? ""} - ${msg}`);

      // Retry once after cleanup for common FK blockers
      try {
        await cleanupUserDependencies(b.id);
        await deleteBotUser(b.id);
        ok += 1;
        console.log(`Deleted (after cleanup): ${b.id} ${b.email ?? ""}`);
      } catch (e2: any) {
        const msg2 = String(e2?.message || e2);
        console.error(`Failed (after cleanup): ${b.id} ${b.email ?? ""} - ${msg2}`);

        // Final fallback: soft-delete the user (disables login) to bypass DB constraints.
        try {
          await deleteBotUser(b.id, true);
          ok += 1;
          console.log(`Soft-deleted (fallback): ${b.id} ${b.email ?? ""}`);
        } catch (e3: any) {
          fail += 1;
          console.error(`Failed (soft-delete fallback): ${b.id} ${b.email ?? ""} - ${String(e3?.message || e3)}`);
        }
      }
    }
  }

  console.log(`\nDone. deleted=${ok} failed=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
