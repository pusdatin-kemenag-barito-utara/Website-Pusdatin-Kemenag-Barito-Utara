/**
 * Retry wrapper untuk query database ke VPS remote yang tidak stabil.
 * Jika query gagal karena koneksi terputus, otomatis dicoba ulang.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  label = "DB"
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      const msg = err?.message || "";
      const cause = err?.cause?.message || "";
      const isConnectionError =
        msg.includes("Connection terminated") ||
        msg.includes("connection timeout") ||
        msg.includes("Client has encountered a connection error") ||
        cause.includes("Connection terminated") ||
        cause.includes("ECONNRESET") ||
        cause.includes("ETIMEDOUT");

      if (!isConnectionError || attempt >= maxRetries) {
        throw err;
      }

      console.warn(
        `[${label}] Connection error on attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${(attempt + 1) * 500}ms...`
      );
      await new Promise((r) => setTimeout(r, (attempt + 1) * 500));
    }
  }

  throw lastError;
}
