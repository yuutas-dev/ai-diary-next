"use client";

import { useEffect, useState } from "react";

/** 外部ブラウザ（Safari / Chrome など LINE アプリ以外）での閲覧・試行用モック userId — API validateUserId と対応 */
export const BROWSER_FALLBACK_LINE_USER_ID = "testuser";

export type LiffAuthStatus = "initializing" | "ready" | "error";

const LIFF_INIT_MAX_ATTEMPTS = 4;
const LIFF_INIT_RETRY_DELAY_MS = 450;

export type FetchCustomersFn = (
  targetUserId: string,
  options?: { showLoading?: boolean },
) => Promise<void>;

/**
 * liff.init が失敗した直後でも isInClient を呼べないことがあるため、
 * 本番 LINE 内 WebView 起因の失敗で testuser に落とさないための補助判定。
 */
function looksLikeLineInAppUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /\bLine\/\d/i.test(ua) || /\bLINEBrowser\b/i.test(ua) || /\bLIFF\b/i.test(ua);
}

async function loadLiffModule() {
  const mod = await import("@line/liff");
  return mod.default;
}

/** 画面表示用（throw 内容を可能な限りそのまま含める） */
export function formatLiffAuthFailureMessage(err: unknown): string {
  const base = "ログインに失敗しました:";
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    const codePart =
      code !== undefined && code !== null && String(code).length > 0 ? ` code=${String(code)}` : "";
    return `${base}${codePart} ${err.message}`.trimEnd();
  }
  if (err !== null && typeof err === "object") {
    try {
      return `${base} ${JSON.stringify(err)}`;
    } catch {
      /* fall through */
    }
  }
  return `${base} ${String(err)}`;
}

async function initLiffWithRetry(liffId: string): Promise<typeof import("@line/liff").default> {
  const liff = await loadLiffModule();
  let lastErr: unknown;
  for (let attempt = 0; attempt < LIFF_INIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, LIFF_INIT_RETRY_DELAY_MS));
      }
      await liff.init({ liffId });
      return liff;
    } catch (e) {
      lastErr = e;
      console.warn(`[useLiffAuth] liff.init attempt ${attempt + 1}/${LIFF_INIT_MAX_ATTEMPTS} failed`, e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function useLiffAuth(
  fetchCustomers: FetchCustomersFn,
  /** LINE アプリ内などで実 userId を取得できなかったとき（リストのローディング解除用） */
  onInAppAuthFailure?: () => void,
): {
  userId: string | null;
  liffAuthStatus: LiffAuthStatus;
  sessionReady: boolean;
  authErrorDetail: string | null;
} {
  const [userId, setUserId] = useState<string | null>(null);
  const [liffAuthStatus, setLiffAuthStatus] = useState<LiffAuthStatus>("initializing");
  const [authErrorDetail, setAuthErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const params = new URLSearchParams(window.location.search);
        const devUser = params.get("dev_user")?.trim();
        if (devUser) {
          setUserId(devUser);
          setAuthErrorDetail(null);
          await fetchCustomers(devUser);
          if (!cancelled) setLiffAuthStatus("ready");
          return;
        }

        const resolvedLiffId = (process.env.NEXT_PUBLIC_LIFF_ID ?? "").trim();
        if (!resolvedLiffId) {
          throw new Error("LIFF IDが設定されていません");
        }

        let liff: Awaited<ReturnType<typeof initLiffWithRetry>>;
        try {
          liff = await initLiffWithRetry(resolvedLiffId);
        } catch (initErr) {
          console.error("[useLiffAuth] LIFF init exhausted after retries:", initErr);
          if (looksLikeLineInAppUserAgent()) {
            if (!cancelled) {
              setUserId(null);
              setAuthErrorDetail(formatLiffAuthFailureMessage(initErr));
              setLiffAuthStatus("error");
              onInAppAuthFailure?.();
            }
            return;
          }
          setAuthErrorDetail(null);
          setUserId(BROWSER_FALLBACK_LINE_USER_ID);
          await fetchCustomers(BROWSER_FALLBACK_LINE_USER_ID);
          if (!cancelled) setLiffAuthStatus("ready");
          return;
        }

        const insideLine = liff.isInClient?.() === true;

        /** --- liff.isInClient() が true（LINE アプリ内）のとき: testuser は絶対に使わない --- */
        if (insideLine) {
          if (!liff.isLoggedIn?.()) {
            liff.login({ redirectUri: window.location.href });
            return;
          }

          let profileUserId = "";
          try {
            const profile = await liff.getProfile();
            profileUserId = profile.userId?.trim() ?? "";
          } catch (profileErr) {
            console.error("LIFF getProfile failed (in LINE client):", profileErr);
            if (!cancelled) {
              setUserId(null);
              setAuthErrorDetail(formatLiffAuthFailureMessage(profileErr));
              setLiffAuthStatus("error");
              onInAppAuthFailure?.();
            }
            return;
          }

          if (!profileUserId) {
            if (!cancelled) {
              setUserId(null);
              setAuthErrorDetail(
                "ログインに失敗しました: userId が空です（getProfile は成功しましたが LINE userId を取得できませんでした）",
              );
              setLiffAuthStatus("error");
              onInAppAuthFailure?.();
            }
            return;
          }

          setUserId(profileUserId);
          setAuthErrorDetail(null);
          await fetchCustomers(profileUserId);
          if (!cancelled) setLiffAuthStatus("ready");
          return;
        }

        /** --- LINE 外ブラウザ: モックは「クライアント外」のときのみ。またログイン済みなら実 ID を優先 --- */
        if (liff.isLoggedIn?.()) {
          try {
            const profile = await liff.getProfile();
            const id = profile.userId?.trim() ?? "";
            if (id) {
              setUserId(id);
              setAuthErrorDetail(null);
              await fetchCustomers(id);
              if (!cancelled) setLiffAuthStatus("ready");
              return;
            }
          } catch (e) {
            console.warn("[useLiffAuth] getProfile failed in external browser (logged-in):", e);
          }
        }

        setAuthErrorDetail(null);
        setUserId(BROWSER_FALLBACK_LINE_USER_ID);
        await fetchCustomers(BROWSER_FALLBACK_LINE_USER_ID);
        if (!cancelled) setLiffAuthStatus("ready");
      } catch (e) {
        console.error("Unexpected LIFF bootstrap error:", e);
        if (!cancelled) {
          setUserId(null);
          setAuthErrorDetail(formatLiffAuthFailureMessage(e));
          setLiffAuthStatus("error");
          onInAppAuthFailure?.();
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [fetchCustomers, onInAppAuthFailure]);

  const sessionReady =
    liffAuthStatus === "ready" &&
    typeof userId === "string" &&
    userId.length > 0;

  return { userId, liffAuthStatus, sessionReady, authErrorDetail };
}
