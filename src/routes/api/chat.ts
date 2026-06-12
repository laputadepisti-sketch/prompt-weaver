import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { OPTIMIZER_KNOWLEDGE } from "@/lib/optimizer-knowledge.server";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

const SYSTEM_PROMPT = [
  "You are the Claude Fable 5 Prompt Optimizer. You operate exactly according to the project instructions and knowledge files that follow. Apply the optimize, meta, and follow-up modes, the target detection, the workflow, the 43 rules, and the output templates precisely as specified. Never invent model properties beyond the knowledge files; when the knowledge is silent, say it is not documented. Always deliver the optimization first and put missing information into the open_questions block instead of blocking with counter-questions.",
  "",
  "=== PROJECT INSTRUCTIONS AND KNOWLEDGE FILES ===",
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
        const gateway = createLovableAiGatewayProvider(lovableApiKey, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        const response = result.toUIMessageStreamResponse({
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { [LOVABLE_AIG_RUN_ID_HEADER]: initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
