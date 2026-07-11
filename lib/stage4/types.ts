import type { CheckInState } from "../stage1";

export type CompanionInput = {
  state: CheckInState;
  stateLabel: string;
  intentLabel: string;
  localResponse: string;
  userText: string;
};

export type AIProviderResponse = {
  text: string;
  model: string;
};

export interface AIProvider {
  readonly id: string;
  validateKey(key: string): Promise<void>;
  respond(key: string, input: CompanionInput): Promise<AIProviderResponse>;
}

export type AIProviderErrorCode =
  | "INVALID_KEY"
  | "NO_CREDITS"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "UNSAFE_RESPONSE"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR";

export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;

  constructor(
    code: AIProviderErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIProviderError";
    this.code = code;
  }
}

export type CompanionResult =
  | {
      source: "ai";
      text: string;
      model: string;
      notice: null;
    }
  | {
      source: "local";
      text: string;
      model: null;
      notice: string;
    };
