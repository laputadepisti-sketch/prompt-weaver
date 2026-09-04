import { createOpenAI } from "@ai-sdk/openai";

export const LLMAPI_BASE_URL = "https://api.llmapi.ai/v1";
export const LLMAPI_MODEL = "gpt-5.6-sol";

export type LlmApiCandidate = {
  model: string;
  providerOptions: Record<string, Record<string, unknown>>;
};

export const LLMAPI_CANDIDATES: LlmApiCandidate[] = [
  {
    model: "gpt-5.6-sol",
    providerOptions: {
      openai: {
        reasoning: { mode: "pro", effort: "xhigh" },
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  },
  {
    model: "gpt-5.6-luna",
    providerOptions: {
      openai: {
        reasoning: { mode: "pro", effort: "xhigh" },
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  },
  {
    model: "gpt-5.4",
    providerOptions: {
      openai: {
        reasoningEffort: "high",
        store: false,
      },
    },
  },
  {
    model: "claude-opus-4-8",
    providerOptions: {
      openai: {
        store: false,
      },
    },
  },
];

export function createLlmApiProvider(apiKey: string) {
  return createOpenAI({
    baseURL: LLMAPI_BASE_URL,
    apiKey,
  });
}
