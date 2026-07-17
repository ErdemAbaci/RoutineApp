import { timingSafeEqual } from "crypto";

type AuthorizerEvent = {
  headers?: Record<string, string | undefined>;
  requestContext?: {
    http?: {
      sourceIp?: string;
    };
  };
};

function safelyMatches(actual: string | undefined, expected: string | undefined) {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function handler(event: AuthorizerEvent) {
  const expectedToken = process.env.DEV_API_TOKEN;
  const allowedSourceIp = process.env.DEV_ALLOWED_SOURCE_IP;
  const providedToken =
    event.headers?.["x-routine-dev-key"] ??
    event.headers?.["X-Routine-Dev-Key"];
  const sourceIp = event.requestContext?.http?.sourceIp;

  return {
    isAuthorized:
      safelyMatches(providedToken, expectedToken) &&
      Boolean(sourceIp && allowedSourceIp && sourceIp === allowedSourceIp),
  };
}
