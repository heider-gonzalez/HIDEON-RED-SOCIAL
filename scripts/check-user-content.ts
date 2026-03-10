import { supabaseAdmin } from "./supabase-admin";

async function count(table: string, column: string, value: string) {
  const { count, error } = await (supabaseAdmin as any)
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const userIds = process.argv.slice(2).filter(Boolean);
  if (userIds.length === 0) {
    console.log("Usage: npx tsx scripts/check-user-content.ts <userId> [userId...]");
    process.exit(1);
  }

  for (const userId of userIds) {
    const rows: Array<[string, number]> = [];

    const tables: Array<[string, string]> = [
      ["profiles", "id"],
      ["posts", "user_id"],
      ["comments", "user_id"],
      ["reactions", "user_id"],
      ["comment_reactions", "user_id"],
      ["saved_posts", "user_id"],
      ["notifications", "sender_id"],
      ["notifications", "receiver_id"],
      ["friendships", "user_id"],
    ];

    for (const [t, c] of tables) {
      try {
        rows.push([`${t}.${c}`, await count(t, c, userId)]);
      } catch {
        // ignore missing tables
      }
    }

    // friendships friend_id too
    try {
      rows.push(["friendships.friend_id", await count("friendships", "friend_id", userId)]);
    } catch {
      // ignore
    }

    console.log(`\nUser ${userId}`);
    for (const [k, v] of rows) {
      if (v) console.log(`  ${k}: ${v}`);
    }
    if (rows.every(([, v]) => v === 0)) {
      console.log("  (no rows found in checked tables)");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
