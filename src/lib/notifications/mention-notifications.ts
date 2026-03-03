import { supabase } from "@/integrations/supabase/client";

/**
 * Extract mentions from text content
 */
export function extractMentions(content: string): string[] {
  const usernames = new Set<string>();

  // Plain format: @username
  const plainRegex = /@(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = plainRegex.exec(content)) !== null) {
    usernames.add(match[1]);
  }

  // Markup format: @[username](userId)
  const markupRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = markupRegex.exec(content)) !== null) {
    usernames.add(match[1]);
  }

  return Array.from(usernames);
}

type ExtractedMention = {
  username: string;
  userId?: string;
};

function extractMentionTargets(content: string): ExtractedMention[] {
  const targets: ExtractedMention[] = [];
  const seen = new Set<string>();

  const markupRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = markupRegex.exec(content)) !== null) {
    const username = match[1];
    const userId = match[2];
    const key = `id:${userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ username, userId });
  }

  const plainRegex = /@(\w+)/g;
  while ((match = plainRegex.exec(content)) !== null) {
    const username = match[1];
    const key = `u:${username}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ username });
  }

  return targets;
}

/**
 * Send mention notifications to mentioned users
 */
export async function sendMentionNotifications(
  content: string,
  senderId: string,
  context: 'message' | 'comment' | 'post',
  contextId?: string
) {
  try {
    const extracted = extractMentionTargets(content);
    if (extracted.length === 0) return;

    const idsFromMarkup = extracted
      .map((t) => t.userId)
      .filter(Boolean) as string[];

    const usernamesToResolve = extracted
      .filter((t) => !t.userId)
      .map((t) => t.username)
      .filter(Boolean);

    const resolvedUsers: Array<{ id: string; username: string }> = [];

    if (idsFromMarkup.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', idsFromMarkup);

      if (Array.isArray(data)) {
        resolvedUsers.push(
          ...data
            .map((u: any) => ({ id: u.id as string, username: (u.username as string) || '' }))
            .filter((u) => Boolean(u.id))
        );
      }
    }

    if (usernamesToResolve.length > 0) {
      const { data: mentionedUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', usernamesToResolve);

      if (usersError) {
        console.error('Error fetching mentioned users:', usersError);
        return;
      }

      if (Array.isArray(mentionedUsers)) {
        resolvedUsers.push(
          ...mentionedUsers
            .map((u: any) => ({ id: u.id as string, username: (u.username as string) || '' }))
            .filter((u) => Boolean(u.id))
        );
      }
    }

    const mentionedUsers = resolvedUsers
      .filter((u) => u.id !== senderId)
      .filter((u, idx, arr) => arr.findIndex((x) => x.id === u.id) === idx);

    if (mentionedUsers.length === 0) return;

    // Create notifications for each mentioned user
    const notifications = mentionedUsers.map((user) => ({
      type: 'mention',
      sender_id: senderId,
      receiver_id: user.id,
      message: `te mencionó en ${
        context === 'message' ? 'un mensaje' : context === 'comment' ? 'un comentario' : 'una publicación'
      }`,
      read: false,
      metadata: {
        context,
        context_id: contextId,
        mentioned_in: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      }
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating mention notifications:', insertError);
    } else {
      console.log(`Created ${notifications.length} mention notifications`);
    }
  } catch (error) {
    console.error('Error in sendMentionNotifications:', error);
  }
}

/**
 * Handle mention notifications when sending messages
 */
export async function handleMessageMentions(
  messageContent: string,
  senderId: string,
  receiverId: string
) {
  await sendMentionNotifications(
    messageContent,
    senderId,
    'message',
    receiverId
  );
}