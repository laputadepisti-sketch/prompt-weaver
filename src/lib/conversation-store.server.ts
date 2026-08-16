type StoredTurn = {
  conversationId: string;
  role: "user" | "assistant";
  text: string;
  index: number;
};

function getConfig() {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function isConversationStoreEnabled(): boolean {
  return getConfig() !== null;
}

export async function storeConversationTurns(turns: StoredTurn[]): Promise<void> {
  const config = getConfig();
  if (!config || turns.length === 0) return;

  const payload = turns
    .filter((turn) => turn.text.trim().length > 0)
    .map((turn) => ({
      id: `${turn.conversationId}:${turn.index}:${turn.role}`,
      data: turn.text.slice(0, 20000),
      metadata: {
        conversationId: turn.conversationId,
        role: turn.role,
        index: turn.index,
        text: turn.text.slice(0, 20000),
        createdAt: new Date().toISOString(),
      },
    }));

  if (payload.length === 0) return;

  const response = await fetch(`${config.url}/upsert-data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upstash Vector upsert failed (${response.status}): ${detail}`);
  }
}

export type ConversationHit = {
  conversationId: string;
  role: string;
  index: number;
  text: string;
  createdAt: string;
  score: number;
};

export async function searchConversations(
  query: string,
  topK: number,
): Promise<ConversationHit[]> {
  const config = getConfig();
  if (!config) return [];

  const response = await fetch(`${config.url}/query-data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: query, topK, includeMetadata: true }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upstash Vector query failed (${response.status}): ${detail}`);
  }

  const json = (await response.json()) as {
    result?: Array<{ score: number; metadata?: Record<string, unknown> }>;
  };

  return (json.result ?? []).map((item) => ({
    conversationId: String(item.metadata?.["conversationId"] ?? ""),
    role: String(item.metadata?.["role"] ?? ""),
    index: Number(item.metadata?.["index"] ?? 0),
    text: String(item.metadata?.["text"] ?? ""),
    createdAt: String(item.metadata?.["createdAt"] ?? ""),
    score: item.score,
  }));
}
