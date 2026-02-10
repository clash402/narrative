import { buildFixPrompt, buildPrompt } from "@/lib/ai/prompts";
import { getProvider } from "@/lib/ai/providers";
import type { RunTaskResult, TaskContext, TaskType } from "@/lib/ai/types";
import { validateOutput } from "@/lib/ai/validation";

type ModelPlan = {
  preferLarge: boolean;
  smallModel: string;
  largeModel: string;
};

function chooseModels(
  taskType: TaskType,
  providerModels: { small: string; large: string },
): ModelPlan {
  const preferLarge = taskType === "OUTLINE_ALL" || taskType === "POST_ALL";

  return {
    preferLarge,
    smallModel: providerModels.small,
    largeModel: providerModels.large,
  };
}

function getMaxRetries(): number {
  const parsed = Number.parseInt(process.env.ROUTER_MAX_RETRIES || "2", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 2;
  }

  return parsed;
}

async function attemptTask(params: {
  taskType: TaskType;
  context: TaskContext;
  prompt: string;
  model: string;
}) {
  const provider = getProvider();
  const output = await provider.generateText({
    model: params.model,
    prompt: params.prompt,
    temperature: 0.3,
    maxTokens: params.taskType.startsWith("OUTLINE") ? 3500 : 3000,
  });

  const validation = validateOutput(params.taskType, output, params.context);

  return {
    providerName: provider.name,
    model: params.model,
    validation,
  };
}

async function runTask<T>(
  taskType: TaskType,
  context: TaskContext,
): Promise<RunTaskResult<T>> {
  const provider = getProvider();
  const modelPlan = chooseModels(taskType, provider.getModelConfig());
  const maxRetries = getMaxRetries();

  const basePrompt = buildPrompt(taskType, context);

  const sequence = modelPlan.preferLarge
    ? [
        modelPlan.largeModel,
        ...Array.from({ length: Math.max(0, maxRetries) }).map(
          () => modelPlan.largeModel,
        ),
      ]
    : [modelPlan.smallModel, modelPlan.smallModel, modelPlan.largeModel];

  let lastErrors: string[] = [];

  for (let index = 0; index < sequence.length; index += 1) {
    const model = sequence[index] as string;
    const prompt =
      index === 0 ? basePrompt : buildFixPrompt(basePrompt, lastErrors);
    const result = await attemptTask({ taskType, context, prompt, model });

    if (result.validation.ok) {
      return {
        data: result.validation.data as T,
        meta: {
          provider: result.providerName,
          model,
          retries: index,
          escalated: !modelPlan.preferLarge && model === modelPlan.largeModel,
        },
      };
    }

    lastErrors = result.validation.errors;
  }

  throw new Error(
    `AI generation failed validation for ${taskType}: ${lastErrors.join(" | ")}`,
  );
}

export { runTask };
