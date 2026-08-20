export type StoredTurn = {
  conversationId: string;
  role: "user" | "assistant";
  text: string;
  index: number;
};

type ConversationStoreConfig = {
  url: string;
  token: string;
};

type UpstashQueryResult = {
  score?: unknown;
  metadata?: unknown;
};

type UpstashQueryResponse = {
  result?: unknown;
};

const MAX_TEXT_LENGTH = 20000;
const DEFAULT_TOP_K = 5;

function getConfig(): ConversationStoreConfig | null {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) return null;

  const trimmedUrl = url.trim().replace(/\/+$/, "");
  const trimmedToken = token.trim();
  if (trimmedUrl.length === 0 || trimmedToken.length === 0) return null;

  return { url: trimmedUrl, token: trimmedToken };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMetadata(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function getFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) return parsedValue;
  }
  return fallback;
}

export function isConversationStoreEnabled(): boolean {
  return getConfig() !== null;
}

export async function storeConversationTurns(turns: StoredTurn[]): Promise<void> {
  const config = getConfig();
  if (!config || turns.length === 0) return;

  const createdAt = new Date().toISOString();

  const payload = turns
    .filter((turn) => turn.text.trim().length > 0)
    .map((turn) => {
      const text = turn.text.slice(0, MAX_TEXT_LENGTH);

      return {
        id: `${turn.conversationId}:${turn.index}:${turn.role}`,
        data: text,
        metadata: {
          conversationId: turn.conversationId,
          role: turn.role,
          index: turn.index,
          text,
          createdAt,
        },
      };
    });

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
  const normalizedQuery = query.trim();
  if (!config || normalizedQuery.length === 0) return [];

  const normalizedTopK = Number.isFinite(topK) ? Math.max(1, Math.floor(topK)) : DEFAULT_TOP_K;

  const response = await fetch(`${config.url}/query-data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: normalizedQuery,
      topK: normalizedTopK,
      includeMetadata: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upstash Vector query failed (${response.status}): ${detail}`);
  }

  const json: unknown = await response.json();
  if (!isRecord(json)) {
    throw new Error("Upstash Vector query returned an invalid response.");
  }

  const queryResponse = json as UpstashQueryResponse;
  if (queryResponse.result === undefined) return [];
  if (!Array.isArray(queryResponse.result)) {
    throw new Error("Upstash Vector query returned an invalid result.");
  }

  return queryResponse.result.map((value): ConversationHit => {
    if (!isRecord(value)) {
      throw new Error("Upstash Vector query returned an invalid result item.");
    }

    const item = value as UpstashQueryResult;
    const metadata = getMetadata(item.metadata);

    return {
      conversationId: String(metadata["conversationId"] ?? ""),
      role: String(metadata["role"] ?? ""),
      index: getFiniteNumber(metadata["index"], 0),
      text: String(metadata["text"] ?? ""),
      createdAt: String(metadata["createdAt"] ?? ""),
      score: getFiniteNumber(item.score, 0),
    };
  });
}
