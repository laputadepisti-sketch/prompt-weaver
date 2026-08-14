import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateText } from "ai";
import { createMcpGateway } from "../gateway";
import { OPTIMIZER_SYSTEM_PROMPT } from "../system-prompt";

export default defineTool({
  name: "refine_prompt",
  title: "Refine an optimized prompt",
  description:
    "Apply a follow-up instruction (shorten, add a constraint, translate, make stricter, etc.) to an already-optimized prompt and return the full re-emitted optimized prompt. Does not return a diff — it returns the complete refined prompt using the standard output blocks.",
  inputSchema: {
    prompt: z
      .string()
      .min(1)
      .describe("The current optimized prompt to refine, verbatim."),
    instruction: z
      .string()
      .min(1)
      .describe("The refinement to apply, e.g. 'make it shorter', 'add a no-comments constraint', 'translate to Hungarian'."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ prompt, instruction }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "LOVABLE_API_KEY is not configured." }],
        isError: true,
      };
    }

    const gateway = createMcpGateway(apiKey);
    const model = gateway.chatModel("google/gemini-3.6-flash");

    const userContent = [
      "Here is the current optimized prompt:",
      "",
      prompt,
      "",
      `Refinement instruction: ${instruction}`,
      "",
      "Apply the refinement and re-emit the complete optimized prompt using the standard output blocks (<optimized_prompt>, <changes>, <open_questions>). Do not return a diff.",
    ].join("\n");

    const { text, usage, finishReason } = await generateText({
      model,
      system: OPTIMIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        refined: text,
        usage: usage ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } : null,
        finishReason,
      },
    };
  },
});
