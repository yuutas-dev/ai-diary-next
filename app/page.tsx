"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = { transcript?: string };
type SpeechRecognitionEventLike = { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>> };
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function Page() {
  const [dailyMemos, setDailyMemos] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // ★ デバッグ用の状態を追加
  const [debugLog, setDebugLog] = useState<string>("待機中...");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("fuzoku_daily_memos");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setDailyMemos(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem("fuzoku_daily_memos", JSON.stringify(dailyMemos));
  }, [dailyMemos, isHydrated]);

  const addMemo = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDailyMemos((prev) => [...prev, trimmed]);
  }, []);

  const handleAddTypedMemo = useCallback(() => {
    addMemo(inputText);
    setInputText("");
  }, [addMemo, inputText]);

  const handleDeleteMemo = useCallback((index: number) => {
    setDailyMemos((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  // ★ ログ出力付きのマイク起動ロジック
  const handleStartListening = useCallback(() => {
    if (typeof window === "undefined") return;
    setDebugLog("1. マイクボタンが押されました");

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setDebugLog("録音を停止しました");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setDebugLog("【致命的エラー】SpeechRecognitionAPIが存在しません。考えられる原因: iOSのChrome、LINE内ブラウザ、またはIframe(Vercelダッシュボード)内でのアクセスです。Safariで直接開いてください。");
      return;
    }

    setDebugLog("2. APIを検知。インスタンスを作成中...");

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setDebugLog("3. マイク起動成功！録音を開始しました");
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || "";
        setDebugLog(`4. 認識成功: ${transcript}`);
        addMemo(transcript);
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        // e.error に具体的なエラー理由（not-allowed等）が入ります
        setDebugLog(`【エラー発生】原因: ${e?.error || "不明"}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) setDebugLog("5. 録音が自動終了しました");
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (e: any) {
      setDebugLog(`【例外エラー】起動時にクラッシュ: ${e?.message || e}`);
      setIsListening(false);
    }
  }, [isListening, addMemo]);

  const handleGenerateSummary = useCallback(() => {
    if (dailyMemos.length === 0) return alert("メモがありません。");
    alert(`【ダミー生成】\n\n${dailyMemos.join("\n")}`);
  }, [dailyMemos]);

  if (!isHydrated) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f9fafb" }}>
      
      {/* ★ デバッグログ表示エリア（最上部に固定表示） */}
      <div style={{ background: "#333", color: "#0f0", padding: "10px", fontSize: "12px", fontFamily: "monospace", zIndex: 9999 }}>
        [LOG]: {debugLog}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", paddingBottom: "180px", WebkitOverflowScrolling: "touch" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#333" }}>📝 今日のメモボード</h2>
        {dailyMemos.map((memo, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fff", padding: "12px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "10px" }}>
            <span style={{ color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>{memo}</span>
            <button onClick={() => handleDeleteMemo(idx)} style={{ background: "none", border: "none", color: "#ccc", fontSize: "20px", padding: "0 4px" }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #eee", padding: "16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", zIndex: 10 }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            onClick={handleStartListening}
            style={{ padding: "0 20px", background: "#111827", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold", fontSize: "20px" }}
          >
            🎤
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="手入力..."
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
          />
          <button onClick={handleAddTypedMemo} style={{ padding: "0 20px", background: "#3b82f6", color: "#fff", borderRadius: "8px", border: "none" }}>追加</button>
        </div>
        <button onClick={handleGenerateSummary} style={{ width: "100%", padding: "16px", background: "#f472b6", color: "#fff", borderRadius: "12px", border: "none", fontWeight: "bold" }}>✨ AIで作成</button>
      </div>

      {isListening && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, pointerEvents: "none" }}>
          <div style={{ fontSize: "100px" }}>🎤</div>
          <div style={{ color: "#fff", fontSize: "24px", fontWeight: "bold", marginTop: "20px" }}>ききとりちゅう...</div>
        </div>
      )}
    </div>
  );
}
