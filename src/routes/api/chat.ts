import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLlmApiProvider, LLMAPI_MODEL } from "@/lib/llmapi.server";
import { OPTIMIZER_KNOWLEDGE } from "@/lib/optimizer-knowledge.server";
import { storeConversationTurns } from "@/lib/conversation-store.server";

const SYSTEM_PROMPT = [
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
        const apiKey = process.env.LLMAPI_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "LLMAPI_KEY is not configured." },
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

        const provider = createLlmApiProvider(apiKey);

        const result = streamText({
          model: provider.responses(LLMAPI_MODEL),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "xhigh",
              reasoningSummary: "auto",
              reasoning: { mode: "pro", effort: "xhigh" },
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
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
                    role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
                    text: uiMessageText(message),
                    index,
                  }))
                  .filter(
                    (turn) =>
                      turn.text.length > 0 &&
                      (turn.role === "user" || turn.role === "assistant"),
                  ),
              );
            } catch (error) {
              console.error("Failed to store conversation:", error);
            }
          },
        });
      },
    },
  },
});

      },
    },
  },
});

