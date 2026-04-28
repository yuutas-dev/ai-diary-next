/** Reserved mock / fallback LINE userIds — permitted for Supabase-backed browser demo sessions（validateUserId 側で許可リスト化） */
const MOCK_FALLBACK_IDS = new Set(["test-user", "testuser", "default-user"]);

/** LINE Messaging / LIFF userId profile format (provider prefix + hex). */
const LINE_USER_ID_REGEX = /^U[0-9a-f]{32,33}$/i;

function normalizeUserIdInput(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function isForbiddenMockUserId(userId) {
  const trimmed = normalizeUserIdInput(userId);
  if (!trimmed) return false;
  return MOCK_FALLBACK_IDS.has(trimmed.toLowerCase());
}

/**
 * Resolves Supabase-facing user id from the request body.
 * - Empty → invalid
 * - Mock IDs (testuser 等): 外部ブラウザ試行との整合のため許可
 * - LINE形式 userId は本番でも許可
 * - NODE_ENV が development のみ任意文字列許可 (?dev_user= など)
 */
function resolveSupabaseUserId(rawUserId) {
  const userId = normalizeUserIdInput(rawUserId);
  if (!userId) {
    return { ok: false, error: "userId が空です。", statusCode: 400 };
  }

  const isDev = process.env.NODE_ENV === "development";

  if (isForbiddenMockUserId(userId)) {
    return { ok: true, userId };
  }

  if (LINE_USER_ID_REGEX.test(userId)) {
    return { ok: true, userId };
  }

  if (isDev) {
    return { ok: true, userId };
  }

  return {
    ok: false,
    error: "userId が不正です（LINEのユーザーID形式ではありません）。",
    statusCode: 400,
  };
}

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

/**
 * Validates userId for APIs that touch Supabase. Returns resolved id or sends error JSON and returns null.
 */
function requireResolvedUserId(bodyUserId, res) {
  const result = resolveSupabaseUserId(bodyUserId);
  if (!result.ok) {
    sendJson(res, result.statusCode, { success: false, error: result.error });
    return null;
  }
  return result.userId;
}


export {
  MOCK_FALLBACK_IDS,
  LINE_USER_ID_REGEX,
  normalizeUserIdInput,
  isForbiddenMockUserId,
  resolveSupabaseUserId,
  requireResolvedUserId,
};
