import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateText } from "ai";
import { createMcpGateway } from "../gateway";
import { OPTIMIZER_SYSTEM_PROMPT } from "../system-prompt";

export default defineTool({
  name: "optimize_prompt",
  title: "Optimize a prompt",
  description:
    "Take a raw, unpolished prompt and rewrite it into a short, precise, model-agnostic prompt using the 'I want to [TASK] so that [SUCCESS CRITERIA]' structure. Returns the optimized prompt, a list of changes, and any open questions. The input language is preserved.",
  inputSchema: {
    prompt: z
      .string()
      .min(1)
      .describe("The raw prompt to optimize, verbatim. Include any hard constraints the user already stated."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ prompt }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "LOVABLE_API_KEY is not configured." }],
        isError: true,
      };
    }

    const gateway = createMcpGateway(apiKey);
    const model = gateway.chatModel("google/gemini-3.6-flash");

    const { text, usage, finishReason } = await generateText({
      model,
      system: OPTIMIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `prompt: ${prompt}` }],
    });

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        optimized: text,
        usage: usage ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } : null,
        finishReason,
      },
    };
  },
});
