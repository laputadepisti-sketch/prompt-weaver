import { createOpenAI } from "@ai-sdk/openai";

export const LLMAPI_BASE_URL = "https://api.llmapi.ai/v1";
export const LLMAPI_MODEL = "gpt-5.6-sol";

export const LLMAPI_PROVIDER_OPTIONS = {
  openai: {
    reasoning: { mode: "pro", effort: "xhigh" },
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

export function createLlmApiProvider(apiKey: string) {
  return createOpenAI({
    baseURL: LLMAPI_BASE_URL,
    apiKey,
  });
}
