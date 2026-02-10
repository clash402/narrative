import type { AIProvider, GenerateTextInput } from "@/lib/ai/types";

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;

  async generateText(input: GenerateTextInput): Promise<string> {
    void input;
    throw new Error(
      "Anthropic provider is a stub in this MVP. Add SDK integration in lib/ai/providers/anthropic.ts.",
    );
  }

  getModelConfig(): { small: string; large: string } {
    return {
      small: process.env.ANTHROPIC_SMALL_MODEL || "claude-3-5-haiku-latest",
      large: process.env.ANTHROPIC_LARGE_MODEL || "claude-3-7-sonnet-latest",
    };
  }
}

export { AnthropicProvider };
