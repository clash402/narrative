import OpenAI from "openai";

import type { AIProvider, GenerateTextInput } from "@/lib/ai/types";

class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: input.model,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 2500,
      messages: [
        {
          role: "user",
          content: input.prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content ?? "";
  }

  getModelConfig(): { small: string; large: string } {
    return {
      small: process.env.OPENAI_SMALL_MODEL || "gpt-4.1-mini",
      large: process.env.OPENAI_LARGE_MODEL || "gpt-4.1",
    };
  }
}

export { OpenAIProvider };
