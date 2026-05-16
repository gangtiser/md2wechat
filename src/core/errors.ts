export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly original?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toAppError(error: unknown, fallbackCode = "ERROR"): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(fallbackCode, error.message, false, error);
  }
  return new AppError(fallbackCode, String(error), false, error);
}
