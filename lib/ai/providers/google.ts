import type { AIProvider, GenerateTextInput } from "@/lib/ai/types";

class GoogleProvider implements AIProvider {
  readonly name = "google" as const;

  async generateText(input: GenerateTextInput): Promise<string> {
    void input;
    throw new Error(
      "Google provider is a stub in this MVP. Add SDK integration in lib/ai/providers/google.ts.",
    );
  }

  getModelConfig(): { small: string; large: string } {
    return {
      small: process.env.GOOGLE_SMALL_MODEL || "gemini-2.0-flash",
      large: process.env.GOOGLE_LARGE_MODEL || "gemini-1.5-pro",
    };
  }
}

export { GoogleProvider };
