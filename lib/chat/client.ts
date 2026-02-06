import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_MODEL } from "@/lib/config";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getChatModel() {
  return openrouter.chat(process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
}
