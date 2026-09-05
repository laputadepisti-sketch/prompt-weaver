import { createOpenAI } from "@ai-sdk/openai";

export const LLMAPI_BASE_URL = "https://api.llmapi.ai/v1";
export const LLMAPI_MODEL = "claude-fable-5-1";

export const LLMAPI_PROVIDER_OPTIONS = {
  openai: {
    store: false,
  },
} as const;

export function createLlmApiProvider(apiKey: string) {
  return createOpenAI({
    baseURL: LLMAPI_BASE_URL,
    apiKey,
  });
}

export function createLlmApiModel(apiKey: string) {
  const provider = createLlmApiProvider(apiKey);
  return provider.chat(LLMAPI_MODEL);
}
