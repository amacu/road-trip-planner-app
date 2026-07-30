const RETRYABLE_DATABASE_CODES = new Set(["P1001", "P1002", "P2024"]);

function databaseErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

function isRetryableDatabaseError(error: unknown) {
  const code = databaseErrorCode(error);
  if (code && RETRYABLE_DATABASE_CODES.has(code)) return true;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return (
    message.includes("EMAXCONNSESSION") ||
    message.includes("max clients reached") ||
    message.includes("Can't reach database server")
  );
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < attempts - 1 && isRetryableDatabaseError(error);
      if (!canRetry) throw error;

      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }

  throw lastError;
}
