import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createLlmApiProvider,
  LLMAPI_MODEL,
  LLMAPI_PROVIDER_OPTIONS,
} from "@/lib/llmapi.server";
import { OPTIMIZER_KNOWLEDGE } from "@/lib/optimizer-knowledge.server";
import { storeConversationTurns } from "@/lib/conversation-store.server";

const OPTIMIZER_SYSTEM_PROMPT = [
  "You are a universal, model-agnostic prompt optimizer. You operate exactly according to the operating instructions that follow. Apply the optimize, refine, and question modes, the workflow, the constraint patterns, and the output blocks precisely as specified. Always deliver the optimized prompt first and put genuinely missing information into the open_questions block instead of blocking with a counter-question. Never add role-play, persona framing, or politeness filler to the prompts you produce.",
  "",
  "=== OPERATING INSTRUCTIONS ===",
  "",
  OPTIMIZER_KNOWLEDGE,
].join("\n");

function uiMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const llmapiKey = process.env.LLMAPI_KEY;
        if (!llmapiKey) {
          return Response.json(
            { error: "No AI provider is configured." },
            { status: 500 },
          );
        }

        let body: { messages?: UIMessage[]; conversationId?: string };
        try {
          body = (await request.json()) as {
            messages?: UIMessage[];
            conversationId?: string;
          };
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return Response.json({ error: "No messages provided." }, { status: 400 });
        }

        const conversationId =
          typeof body.conversationId === "string" && body.conversationId.length > 0
            ? body.conversationId
            : crypto.randomUUID();

        const provider = createLlmApiProvider(llmapiKey);
        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
          model: provider.responses(LLMAPI_MODEL),
          system: OPTIMIZER_SYSTEM_PROMPT,
          messages: modelMessages,
          abortSignal: request.signal,
          providerOptions: LLMAPI_PROVIDER_OPTIONS as never,
        });

        return result.toUIMessageStreamResponse({
          sendReasoning: true,
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              await storeConversationTurns(
                finalMessages
                  .map((message, index) => ({
                    conversationId,
                    role:
                      message.role === "assistant"
                        ? ("assistant" as const)
                        : ("user" as const),
                    text: uiMessageText(message),
                    index,
                  }))
                  .filter((turn) => turn.text.length > 0),
              );
            } catch (error) {
              console.error("Failed to store conversation:", error);
            }
          },
          onError: (error) =>
            error instanceof Error ? error.message : "Az AI szolgáltató hibát adott.",
        });
      },
    },
  },
});
