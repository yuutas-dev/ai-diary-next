"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech APIの型定義
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
  onerror: (() => void) | null;
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

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // 1. LocalStorageからの復元のみ（マイクの事前準備は削除）
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("fuzoku_daily_memos");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDailyMemos(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch (e) {
      console.error("LocalStorage error", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. データ保存
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

  // 3. 【完全修正】マイク起動ロジック
  const handleStartListening = useCallback(() => {
    // 【検証用】物理的にタップできているかを絶対に証明するアラート
    // 動くことが確認できたら、この行は消してください
    console.log("マイクボタンがタップされました");

    if (typeof window === "undefined") return;

    // すでに起動中なら止める
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // ★重要：タップされた瞬間に初めてインスタンスを作る（スマホ対策）
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      // http://192.168... でアクセスしている場合や、未対応ブラウザの場合はここに入ります
      alert("【エラー】マイクが使えません。\nスマホの場合は http://192... ではなく、VercelのURL（https://〜）を開いてください。");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || "";
        addMemo(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        console.error("Speech recognition error");
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (e) {
      console.error(e);
      alert("マイクの起動に失敗しました。ブラウザのマイク権限を確認してください。");
      setIsListening(false);
    }
  }, [isListening, addMemo]);

  const handleGenerateSummary = useCallback(() => {
    if (dailyMemos.length === 0) {
      alert("メモがありません。まずはメモを追加してください。");
      return;
    }
    alert(`【ダミー生成】\n\n${dailyMemos.join("\n")}`);
  }, [dailyMemos]);

  if (!isHydrated) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f9fafb" }}>
      <style>{`
        @keyframes listeningPulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>

      {/* --- 上部：メモボードエリア --- */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", paddingBottom: "180px", WebkitOverflowScrolling: "touch" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#333" }}>📝 今日のメモボード</h2>
        {dailyMemos.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", marginTop: "40px" }}>ここに今日の接客メモが溜まります</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dailyMemos.map((memo, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fff", padding: "12px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <span style={{ color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>{memo}</span>
                <button onClick={() => handleDeleteMemo(idx)} style={{ background: "none", border: "none", color: "#ccc", fontSize: "20px", padding: "0 4px", cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- 下部：入力エリア --- */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #eee", padding: "16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", zIndex: 10 }}>
        
        {/* 今回は重なり検証のため、すべてのボタンを横一列に並べました */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            onClick={handleStartListening}
            style={{ padding: "0 20px", background: "#111827", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold", fontSize: "20px", cursor: "pointer" }}
          >
            🎤
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="手入力..."
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
            onKeyDown={(e) => e.key === "Enter" && handleAddTypedMemo()}
          />
          <button onClick={handleAddTypedMemo} style={{ padding: "0 20px", background: "#3b82f6", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold" }}>
            追加
          </button>
        </div>

        <button onClick={handleGenerateSummary} style={{ width: "100%", padding: "16px", background: "#f472b6", color: "#fff", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "16px" }}>
          ✨ 今日のまとめ日記をAIで作成
        </button>
      </div>

      {/* --- 録音中オーバーレイ --- */}
      {isListening && (
        <div onClick={handleStartListening} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ fontSize: "100px", animation: "listeningPulse 1.2s infinite" }}>🎤</div>
          <div style={{ color: "#fff", fontSize: "24px", fontWeight: "bold", marginTop: "20px" }}>ききとりちゅう...</div>
        </div>
      )}
    </div>
  );
}
