import {
  AIProviderError,
  type AIProvider,
  type CompanionInput,
  type CompanionResult,
} from "./types";

const PRESSURE_PATTERNS = [
  /(?:你|这次).{0,6}(?:失败|不自律|意志力差)/,
  /(?:罪恶|羞耻|赎罪|惩罚自己)/,
  /(?:补偿|抵消).{0,8}(?:运动|训练|热量)/,
  /(?:饿一顿|少吃一顿|断食|催吐)/,
  /必须.{0,8}(?:消耗|减掉|忍住)/,
];

export function isSafeCompanionResponse(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return !PRESSURE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export async function requestCompanionResponse({
  provider,
  key,
  input,
}: {
  provider: AIProvider;
  key: string;
  input: CompanionInput;
}): Promise<CompanionResult> {
  try {
    const response = await provider.respond(key, input);
    if (!isSafeCompanionResponse(response.text)) {
      throw new AIProviderError(
        "UNSAFE_RESPONSE",
        "Provider response crossed the companion policy boundary",
      );
    }
    return {
      source: "ai",
      text: response.text,
      model: response.model,
      notice: null,
    };
  } catch {
    return {
      source: "local",
      text: input.localResponse,
      model: null,
      notice: "这次模型没有接上。你写的话还在这里，先把本机回应留给你。",
    };
  }
}
