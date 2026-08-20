import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ConversationDetail, ConversationSummary } from "./chat-history.server";

const deviceSchema = z.object({
  deviceId: z.string().min(8).max(128),
});

const conversationSchema = deviceSchema.extend({
  conversationId: z.string().uuid(),
});

export const listConversations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deviceSchema.parse(input))
  .handler(async ({ data }): Promise<ConversationSummary[]> => {
    const { listConversationsForDevice } = await import("./chat-history.server");
    return listConversationsForDevice(data.deviceId, 100);
  });

export const getConversation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => conversationSchema.parse(input))
  .handler(async ({ data }): Promise<ConversationDetail | null> => {
    const { getConversationForDevice } = await import("./chat-history.server");
    return getConversationForDevice(data.deviceId, data.conversationId);
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => conversationSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deleteConversationForDevice } = await import("./chat-history.server");
    await deleteConversationForDevice(data.deviceId, data.conversationId);
    return { ok: true };
  });
