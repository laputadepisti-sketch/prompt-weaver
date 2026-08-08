import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createLovableAiGatewayResponsesProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { OPTIMIZER_KNOWLEDGE } from "@/lib/optimizer-knowledge.server";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

const SYSTEM_PROMPT = [
  "You are a universal, model-agnostic prompt optimizer. You operate exactly according to the operating instructions that follow. Apply the optimize, refine, and question modes, the workflow, the constraint patterns, and the output blocks precisely as specified. Always deliver the optimized prompt first and put genuinely missing information into the open_questions block instead of blocking with a counter-question. Never add role-play, persona framing, or politeness filler to the prompts you produce.",
  "",
  "=== OPERATING INSTRUCTIONS ===",
  "",
  OPTIMIZER_KNOWLEDGE,
].join("\n");

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableApiKey = process.env.LOVABLE_API_KEY;
        if (!lovableApiKey) {
          return Response.json(
            { error: "LOVABLE_API_KEY is not configured." },
            { status: 500 },
          );
        }

        let body: { messages?: UIMessage[] };
        try {
          body = (await request.json()) as { messages?: UIMessage[] };
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return Response.json({ error: "No messages provided." }, { status: 400 });
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayResponsesProvider(lovableApiKey, initialRunId);

        const result = streamText({
          model: gateway.responses("openai/gpt-5.6-sol"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "xhigh",
              reasoningSummary: "auto",
              reasoning: { mode: "pro", effort: "xhigh", summary: "auto" },
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const response = result.toUIMessageStreamResponse({
          sendReasoning: true,
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { [LOVABLE_AIG_RUN_ID_HEADER]: initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
