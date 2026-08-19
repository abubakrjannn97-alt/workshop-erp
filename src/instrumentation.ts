export async function onRequestError(
  err: { digest?: string; message: string },
  request: { path: string; method: string },
) {
  const { logger } = await import("@core/infrastructure/logger");
  logger.error({ err, path: request.path, method: request.method }, "Unhandled request error");
}
