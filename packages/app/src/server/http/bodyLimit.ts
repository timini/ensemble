/** A request body over the limit. */
export class BodyTooLargeError extends Error {
  constructor(readonly limit: number) {
    super(`Request body over ${limit} bytes`);
    this.name = "BodyTooLargeError";
  }
}

/**
 * The request body as text, refusing one over `maxBytes` before reading it
 * when Content-Length says so, and after reading when it does not.
 */
export async function readBodyLimited(
  req: Request,
  maxBytes: number,
): Promise<string> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new BodyTooLargeError(maxBytes);
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes)
    throw new BodyTooLargeError(maxBytes);
  return text;
}
