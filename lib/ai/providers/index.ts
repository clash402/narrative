import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { GoogleProvider } from "@/lib/ai/providers/google";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import type { AIProvider } from "@/lib/ai/types";

function getProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "openai").toLowerCase();

  if (providerName === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai.");
    }

    return new OpenAIProvider(process.env.OPENAI_API_KEY);
  }

  if (providerName === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic.",
      );
    }

    return new AnthropicProvider();
  }

  if (providerName === "google") {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is required when AI_PROVIDER=google.");
    }

    return new GoogleProvider();
  }

  throw new Error(`Unsupported AI_PROVIDER: ${providerName}`);
}

export { getProvider };
