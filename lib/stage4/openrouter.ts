import {
  AIProviderError,
  type AIProvider,
  type AIProviderErrorCode,
  type AIProviderResponse,
  type CompanionInput,
} from "./types";

export const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";
export const OPENROUTER_DEFAULT_MODEL = "openrouter/free";

type FetchLike = typeof fetch;

export type OpenRouterProviderOptions = {
  fetchImpl?: FetchLike;
  model?: string;
  referer?: string;
  timeoutMs?: number;
};

type OpenRouterErrorBody = {
  error?: {
    code?: number;
    message?: string;
    metadata?: { error_type?: string };
  };
};

type OpenRouterChatBody = OpenRouterErrorBody & {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

const SYSTEM_PROMPT = `你是一个非审判型体重管理陪伴者。请只回应用户此刻说的话，使用自然、简短的中文，两到四句即可。

必须遵守：
- 不评价自律、成功、失败、胖瘦或意志力。
- 不制造羞耻、恐惧或补偿压力，不建议节食、断食、催吐或追加运动。
- 不把热量、运动量或体重变成道德判断。
- 不做医疗诊断；如出现明确的紧急伤害风险，只建议尽快联系当地急救或可信任的人。
- 允许用户休息、吃东西、停止对话或只留下记录。
- 不声称看过未发送的照片、历史记录或身体数据。`;

function normalizeKey(key: string) {
  const normalized = key.trim();
  if (!normalized) {
    throw new AIProviderError("INVALID_KEY", "OpenRouter key is empty");
  }
  return normalized;
}

function errorCodeForStatus(status: number): AIProviderErrorCode {
  if (status === 401 || status === 403) return "INVALID_KEY";
  if (status === 402) return "NO_CREDITS";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "UNAVAILABLE";
  return "INVALID_RESPONSE";
}

function responseText(content: OpenRouterChatBody["choices"]) {
  const value = content?.[0]?.message?.content;
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text?.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

export class OpenRouterProvider implements AIProvider {
  readonly id = "openrouter";
  private readonly fetchImpl: FetchLike;
  private readonly model: string;
  private readonly referer?: string;
  private readonly timeoutMs: number;

  constructor(options: OpenRouterProviderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.model = options.model ?? OPENROUTER_DEFAULT_MODEL;
    this.referer = options.referer;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  private headers(key: string) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${normalizeKey(key)}`,
      "Content-Type": "application/json",
      "X-Title": "Jianfei Paipai",
    };
    if (this.referer) headers["HTTP-Referer"] = this.referer;
    return headers;
  }

  private async request(
    path: string,
    key: string,
    init: Omit<RequestInit, "headers" | "signal">,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchImpl(`${OPENROUTER_API_BASE}${path}`, {
        ...init,
        headers: this.headers(key),
        signal: controller.signal,
      });
    } catch (error) {
      throw new AIProviderError(
        "NETWORK_ERROR",
        "OpenRouter request could not be completed",
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async validateKey(key: string): Promise<void> {
    const response = await this.request("/key", key, { method: "GET" });
    if (!response.ok) {
      throw new AIProviderError(
        errorCodeForStatus(response.status),
        `OpenRouter key validation failed with ${response.status}`,
      );
    }
  }

  async respond(
    key: string,
    input: CompanionInput,
  ): Promise<AIProviderResponse> {
    const response = await this.request("/chat/completions", key, {
      method: "POST",
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `当前状态：${input.stateLabel}`,
              `用户选择：${input.intentLabel}`,
              `本机已经给出的回应：${input.localResponse}`,
              `用户现在想说：${input.userText}`,
            ].join("\n"),
          },
        ],
        max_tokens: 260,
        temperature: 0.65,
      }),
    });

    let body: OpenRouterChatBody;
    try {
      body = (await response.json()) as OpenRouterChatBody;
    } catch (error) {
      throw new AIProviderError(
        "INVALID_RESPONSE",
        "OpenRouter returned unreadable JSON",
        { cause: error },
      );
    }

    if (!response.ok || body.error) {
      const status = body.error?.code ?? response.status;
      throw new AIProviderError(
        errorCodeForStatus(status),
        `OpenRouter response failed with ${status}`,
      );
    }

    const text = responseText(body.choices);
    if (!text) {
      throw new AIProviderError(
        "INVALID_RESPONSE",
        "OpenRouter response did not contain text",
      );
    }

    return {
      text,
      model: body.model || this.model,
    };
  }
}
