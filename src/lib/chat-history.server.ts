export type PersistedRole = "user" | "assistant";

export type PersistedTurn = {
  role: PersistedRole;
  text: string;
  position: number;
};

export type ConversationSummary = {
  id: string;
  skill: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type ConversationDetail = {
  id: string;
  skill: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: { id: string; role: PersistedRole; content: string; position: number }[];
};

const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 200000;

export function buildTitle(text: string): string {
  const normalized = text.replace(/^\s*prompt:\s*/i, "").replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return "Új beszélgetés";
  if (normalized.length <= MAX_TITLE_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}

function normalizeRole(value: unknown): PersistedRole {
  return value === "assistant" ? "assistant" : "user";
}

export async function persistConversation(input: {
  conversationId: string;
  deviceId: string;
  skill: string;
  turns: PersistedTurn[];
}): Promise<void> {
  const turns = input.turns.filter((turn) => turn.text.trim().length > 0);
  if (turns.length === 0) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const firstUserTurn = turns.find((turn) => turn.role === "user");
  const title = buildTitle(firstUserTurn ? firstUserTurn.text : turns[0].text);

  const { error: conversationError } = await supabaseAdmin
    .from("conversations")
    .upsert(
      {
        id: input.conversationId,
        device_id: input.deviceId,
        skill: input.skill,
        title,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (conversationError) throw new Error(conversationError.message);

  const rows = turns.map((turn) => ({
    conversation_id: input.conversationId,
    role: turn.role,
    content: turn.text.slice(0, MAX_CONTENT_LENGTH),
    position: turn.position,
  }));

  const { error: messagesError } = await supabaseAdmin
    .from("messages")
    .upsert(rows, { onConflict: "conversation_id,position" });

  if (messagesError) throw new Error(messagesError.message);
}

export async function listConversationsForDevice(
  deviceId: string,
  limit: number,
): Promise<ConversationSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, skill, title, created_at, updated_at, messages(count)")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    const counts = row.messages as unknown as { count: number }[] | null;
    return {
      id: row.id,
      skill: row.skill,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: Array.isArray(counts) && counts.length > 0 ? counts[0].count : 0,
    };
  });
}

export async function getConversationForDevice(
  deviceId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, skill, title, created_at, updated_at")
    .eq("device_id", deviceId)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: messageRows, error: messagesError } = await supabaseAdmin
    .from("messages")
    .select("id, role, content, position")
    .eq("conversation_id", conversationId)
    .order("position", { ascending: true });

  if (messagesError) throw new Error(messagesError.message);

  return {
    id: data.id,
    skill: data.skill,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    messages: (messageRows ?? []).map((row) => ({
      id: row.id,
      role: normalizeRole(row.role),
      content: row.content,
      position: row.position,
    })),
  };
}

export async function deleteConversationForDevice(
  deviceId: string,
  conversationId: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { error } = await supabaseAdmin
    .from("conversations")
    .delete()
    .eq("device_id", deviceId)
    .eq("id", conversationId);

  if (error) throw new Error(error.message);
}
