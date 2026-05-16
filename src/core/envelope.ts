export type EnvelopeStatus = "completed" | "action_required" | "failed";

export interface JsonEnvelope<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  schema_version: "1.0";
  status: EnvelopeStatus;
  retryable: boolean;
  data?: T;
  error?: string;
}

export function successEnvelope<T>(code: string, message: string, data: T): JsonEnvelope<T> {
  return {
    success: true,
    code,
    message,
    schema_version: "1.0",
    status: "completed",
    retryable: false,
    data
  };
}

export function actionEnvelope<T>(code: string, message: string, data: T): JsonEnvelope<T> {
  return {
    success: true,
    code,
    message,
    schema_version: "1.0",
    status: "action_required",
    retryable: false,
    data
  };
}

export function failureEnvelope(code: string, message: string, retryable: boolean, error?: string): JsonEnvelope {
  return {
    success: false,
    code,
    message,
    schema_version: "1.0",
    status: "failed",
    retryable,
    error
  };
}
