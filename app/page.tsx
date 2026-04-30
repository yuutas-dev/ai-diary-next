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

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("fuzoku_daily_memos");
      if (!stored) {
        setIsHydrated(true);
        return;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setDailyMemos(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      // ignore broken localStorage payload and continue
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem("fuzoku_daily_memos", JSON.stringify(dailyMemos));
  }, [dailyMemos, isHydrated]);

  const addMemo = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    setDailyMemos((prev) => [...prev, text]);
  }, []);

  const handleAddTypedMemo = useCallback(() => {
    addMemo(inputText);
    setInputText("");
  }, [addMemo, inputText]);

  const handleCancelListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleToggleVoiceInput = useCallback(() => {
    if (typeof window === "undefined") return;

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      alert("このブラウザでは音声入力を利用できません。");
      return;
    }

    if (isListening && recognitionRef.current) {
      handleCancelListening();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const text = transcript.trim();
      if (text) {
        setDailyMemos((prev) => [...prev, text]);
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [handleCancelListening, isListening]);

  const handleDeleteMemo = useCallback((index: number) => {
    setDailyMemos((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleGenerateSummary = useCallback(() => {
    alert(`【ダミー】AIでまとめ日記を作成します:\n\n${dailyMemos.join("\n")}`);
  }, [dailyMemos]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f9fafb", position: "relative" }}>
      <style>{`
        @keyframes listeningPulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", paddingBottom: "150px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#333" }}>📝 今日のメモボード</h2>
        {dailyMemos.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", marginTop: "40px" }}>ここに今日の接客メモが溜まります</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dailyMemos.map((memo, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "10px",
                  background: "#fff",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  color: "#333",
                }}
              >
                <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>{memo}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteMemo(idx)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#999",
                    fontSize: "18px",
                    lineHeight: 1,
                    cursor: "pointer",
                    padding: 0,
                    marginTop: "-2px",
                  }}
                  aria-label="メモを削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #eee",
          padding: "16px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            style={{
              padding: "10px",
              background: isListening ? "#fee2e2" : "#f3f4f6",
              borderRadius: "50%",
              border: "none",
              fontSize: "20px",
              touchAction: "manipulation",
              cursor: "pointer",
            }}
          >
            {isListening ? "🔴" : "🎤"}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="メモを手入力..."
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
          />
          <button
            type="button"
            onClick={handleAddTypedMemo}
            style={{
              padding: "10px 16px",
              background: "#3b82f6",
              color: "#fff",
              borderRadius: "8px",
              border: "none",
              fontWeight: "bold",
              touchAction: "manipulation",
              cursor: "pointer",
            }}
          >
            追加
          </button>
        </div>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "16px",
            background: "#f472b6",
            color: "#fff",
            borderRadius: "12px",
            border: "none",
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            touchAction: "manipulation",
            cursor: "pointer",
          }}
          onClick={handleGenerateSummary}
        >
          ✨ 今日のまとめ日記をAIで作成
        </button>
      </div>
      {isListening ? (
        <div
          onClick={handleCancelListening}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "84px", animation: "listeningPulse 1.2s ease-in-out infinite" }}>🎤</div>
            <div style={{ color: "#fff", fontSize: "20px", fontWeight: "bold" }}>ききとりちゅう...</div>
            <button
              type="button"
              onClick={handleCancelListening}
              style={{
                marginTop: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
