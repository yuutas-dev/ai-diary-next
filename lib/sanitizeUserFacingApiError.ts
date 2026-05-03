/**
 * Cloudflare / ゲートウェイが返す HTML エラーページやタイムアウト系を、ユーザー向けに伏せる。
 */

export const SERVER_UNAVAILABLE_USER_MESSAGE =
  "サーバーとの通信がタイムアウトしました。電波の良い環境でしばらく経ってから再度お試しください。";

const HTML_LOWER_MARKERS = [
  "<!doctype html",
  "<html",
  "<head",
  "<body",
  "cloudflare",
  "cf-ray",
  "error code 522",
  "error 522",
];

const GATEWAY_OR_TIMEOUT_STATUSES = new Set([502, 503, 504, 522]);

export function isGatewayOrTimeoutHttpStatus(status: number): boolean {
  return GATEWAY_OR_TIMEOUT_STATUSES.has(status);
}

function combinedLowerForDetection(parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000)
    .toLowerCase();
}

export function responseLooksLikeHtmlErrorPage(text: string): boolean {
  const s = combinedLowerForDetection([text]);
  return HTML_LOWER_MARKERS.some((m) => s.includes(m));
}

export function looksLikeJsonParseErrorFromHtmlBody(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("unexpected token")
    || m.includes("is not valid json")
    || m.includes("expected json")
  );
}

export type SanitizeUserFacingApiMessageInput = {
  primaryMessage: string;
  httpStatus?: number;
  rawBody?: string;
};

export function sanitizeUserFacingApiMessage(input: SanitizeUserFacingApiMessageInput): string {
  const primary = (input.primaryMessage || "").trim();
  const raw = input.rawBody || "";
  const status = input.httpStatus;
  if (status !== undefined && isGatewayOrTimeoutHttpStatus(status)) {
    return SERVER_UNAVAILABLE_USER_MESSAGE;
  }
  const blob = combinedLowerForDetection([primary, raw]);
  if (HTML_LOWER_MARKERS.some((m) => blob.includes(m))) {
    return SERVER_UNAVAILABLE_USER_MESSAGE;
  }
  if (looksLikeJsonParseErrorFromHtmlBody(primary)) {
    return SERVER_UNAVAILABLE_USER_MESSAGE;
  }
  return primary || "不明なエラー";
}

export function userFacingMessageFromError(
  error: unknown,
  ctx?: { httpStatus?: number; rawBody?: string },
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);
  return sanitizeUserFacingApiMessage({
    primaryMessage: raw,
    httpStatus: ctx?.httpStatus,
    rawBody: ctx?.rawBody,
  });
}

export async function readFetchBodyAsTextAndJson(res: Response): Promise<{
  status: number;
  text: string;
  json: unknown | null;
}> {
  const text = await res.text().catch(() => "");
  let json: unknown | null = null;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

export function apiErrorFieldFromUnknownJson(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const err = (json as { error?: unknown }).error;
  return typeof err === "string" && err.trim() ? err.trim() : fallback;
}
