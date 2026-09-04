import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { createLlmApiProvider, LLMAPI_CANDIDATES } from "@/lib/llmapi.server";
import { OPTIMIZER_KNOWLEDGE } from "@/lib/optimizer-knowledge.server";
import { storeConversationTurns } from "@/lib/conversation-store.server";
import { isSkillId, type SkillId } from "@/lib/skills";

const OPTIMIZER_SYSTEM_PROMPT = [
  "You are a universal, model-agnostic prompt optimizer. You operate exactly according to the operating instructions that follow. Apply the optimize, refine, and question modes, the workflow, the constraint patterns, and the output blocks precisely as specified. Always deliver the optimized prompt first and put genuinely missing information into the open_questions block instead of blocking with a counter-question. Never add role-play, persona framing, or politeness filler to the prompts you produce.",
  "",
  "=== OPERATING INSTRUCTIONS ===",
  "",
  OPTIMIZER_KNOWLEDGE,
].join("\n");

const CHAT_SYSTEM_PROMPT = [
  "You are a precise, technically competent assistant. Answer directly and completely, in the language of the user's message.",
  "Never produce simplified, mock, placeholder, dummy, simulated or fake content. When you output code, output complete, unabridged, production-ready code with no truncation, no ellipses, and no comments.",
  "Skip role-play framing, persona introductions and politeness filler. Prefer concrete steps, exact commands and working code over abstract description.",
  "If a request is ambiguous, state the assumption you take and continue; ask only when the answer would otherwise be unusable.",
].join("\n");

function systemPromptFor(skill: SkillId): string {
  return skill === "optimizer" ? OPTIMIZER_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT;
}

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

        let body: { messages?: UIMessage[]; conversationId?: string; skill?: string };
        try {
          body = (await request.json()) as {
            messages?: UIMessage[];
            conversationId?: string;
            skill?: string;
          };
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return Response.json({ error: "No messages provided." }, { status: 400 });
        }

        const skill: SkillId = isSkillId(body.skill) ? body.skill : "chat";

        const conversationId =
          typeof body.conversationId === "string" && body.conversationId.length > 0
            ? body.conversationId
            : crypto.randomUUID();

        const provider = createLlmApiProvider(llmapiKey);
        const modelMessages = await convertToModelMessages(messages);

        const persist = async (finalMessages: UIMessage[]) => {
          try {
            await storeConversationTurns(
              finalMessages
                .map((message, index) => ({
                  conversationId,
                  role:
                    message.role === "assistant" ? ("assistant" as const) : ("user" as const),
                  text: uiMessageText(message),
                  index,
                }))
                .filter((turn) => turn.text.length > 0),
            );
          } catch (error) {
            console.error("Failed to store conversation:", error);
          }
        };

        let lastErrorText = "The AI provider is unavailable.";

        for (const candidate of LLMAPI_CANDIDATES) {
          let reader: ReadableStreamDefaultReader<UIMessageChunk> | null = null;
          try {
            const result = streamText({
              model: provider.responses(candidate.model),
              system: systemPromptFor(skill),
              messages: modelMessages,
              abortSignal: request.signal,
              providerOptions: candidate.providerOptions as never,
            });

            const uiStream = result.toUIMessageStream({
              sendReasoning: true,
              originalMessages: messages,
              onFinish: async ({ messages: finalMessages }) => {
                await persist(finalMessages);
              },
            });

            reader = uiStream.getReader();

            const buffered: UIMessageChunk[] = [];
            let failed = false;

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value.type === "error") {
                lastErrorText =
                  typeof value.errorText === "string" && value.errorText.length > 0
                    ? value.errorText
                    : lastErrorText;
                failed = true;
                break;
              }
              buffered.push(value);
              if (value.type === "text-delta" || value.type === "reasoning-delta") {
                break;
              }
            }

            if (failed) {
              await reader.cancel().catch(() => undefined);
              reader = null;
              continue;
            }

            const activeReader = reader;
            const stream = new ReadableStream<UIMessageChunk>({
              start(controller) {
                for (const chunk of buffered) {
                  controller.enqueue(chunk);
                }
              },
              async pull(controller) {
                const { value, done } = await activeReader.read();
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
              },
              async cancel(reason) {
                await activeReader.cancel(reason).catch(() => undefined);
              },
            });

            return createUIMessageStreamResponse({ stream });
          } catch (error) {
            if (reader) {
              await reader.cancel().catch(() => undefined);
            }
            lastErrorText = error instanceof Error ? error.message : lastErrorText;
          }
        }

        return Response.json({ error: lastErrorText }, { status: 502 });
      },
    },
  },
});
