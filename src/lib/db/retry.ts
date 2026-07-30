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
        attempt < attempts - 1 &&
        RETRYABLE_DATABASE_CODES.has(databaseErrorCode(error) ?? "");
      if (!canRetry) throw error;

      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }

  throw lastError;
}
