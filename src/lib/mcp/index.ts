import { defineMcp } from "@lovable.dev/mcp-js";
import optimizePromptTool from "./tools/optimize-prompt";
import refinePromptTool from "./tools/refine-prompt";

export default defineMcp({
  name: "prompt-optimizer",
  title: "Prompt Optimizer",
  version: "0.1.0",
  instructions:
    "Tools for the Prompt Optimizer app. Use `optimize_prompt` to turn a raw prompt into a short, precise, model-agnostic prompt (returned with a changes list and open questions). Use `refine_prompt` to apply a follow-up instruction (shorten, add a constraint, translate) to an already-optimized prompt and get the full refined prompt back. Both tools preserve the input language and keep hard constraints as absolute rules.",
  tools: [optimizePromptTool, refinePromptTool],
});
