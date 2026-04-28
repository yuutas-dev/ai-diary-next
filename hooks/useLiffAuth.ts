"use client";

import { useEffect, useState } from "react";

/** 外部ブラウザ（Safari / Chrome など LINEアプリ以外）での閲覧・試行用モック userId — API validateUserId と対応 */
export const BROWSER_FALLBACK_LINE_USER_ID = "testuser";

export type LiffAuthStatus = "initializing" | "ready" | "error";

const LIFF_ID = "2009902106-W8zW5hJA";

export type FetchCustomersFn = (
  targetUserId: string,
  options?: { showLoading?: boolean },
) => Promise<void>;

export function useLiffAuth(
  fetchCustomers: FetchCustomersFn,
  /** LINEアプリ内の認証失敗時のみ（リストのローディング解除用） */
  onInAppAuthFailure?: () => void,
): {
  userId: string | null;
  liffAuthStatus: LiffAuthStatus;
  sessionReady: boolean;
} {
  const [userId, setUserId] = useState<string | null>(null);
  const [liffAuthStatus, setLiffAuthStatus] = useState<LiffAuthStatus>("initializing");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const params = new URLSearchParams(window.location.search);
        const devUser = params.get("dev_user")?.trim();
        if (devUser) {
          setUserId(devUser);
          await fetchCustomers(devUser);
          if (!cancelled) setLiffAuthStatus("ready");
          return;
        }

        let liff: typeof import("@line/liff").default;

        try {
          liff = (await import("@line/liff")).default;
          await liff.init({ liffId: LIFF_ID });
        } catch (initErr) {
          console.warn("LIFF init failed; using browser fallback userId:", initErr);
          setUserId(BROWSER_FALLBACK_LINE_USER_ID);
          await fetchCustomers(BROWSER_FALLBACK_LINE_USER_ID);
          if (!cancelled) setLiffAuthStatus("ready");
          return;
        }

        // LINE組み込みブラウザ以外では OAuth を強制しない — Supabase とUIを確実に使えるようにモック
        if (!liff.isInClient?.()) {
          setUserId(BROWSER_FALLBACK_LINE_USER_ID);
          await fetchCustomers(BROWSER_FALLBACK_LINE_USER_ID);
          if (!cancelled) setLiffAuthStatus("ready");
          return;
        }

        // --- LINE アプリ内: ログイン状態を確認し実 userId を必ず取得 ---
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
            setLiffAuthStatus("error");
            onInAppAuthFailure?.();
          }
          return;
        }

        if (!profileUserId) {
          if (!cancelled) {
            setUserId(null);
            setLiffAuthStatus("error");
            onInAppAuthFailure?.();
          }
          return;
        }

        setUserId(profileUserId);
        await fetchCustomers(profileUserId);
        if (!cancelled) setLiffAuthStatus("ready");
      } catch (e) {
        console.error("Unexpected LIFF bootstrap error:", e);
        if (!cancelled) {
          setUserId(null);
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

  return { userId, liffAuthStatus, sessionReady };
}
