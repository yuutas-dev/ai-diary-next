"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function Page() {
  const [dailyMemos, setDailyMemos] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const canUseSpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return false;
    return typeof window.SpeechRecognition !== "undefined" || typeof window.webkitSpeechRecognition !== "undefined";
  }, []);

  const addMemo = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    setDailyMemos((prev) => [...prev, text]);
  }, []);

  const handleAddTypedMemo = useCallback(() => {
    addMemo(inputText);
    setInputText("");
  }, [addMemo, inputText]);

  const handleToggleVoiceInput = useCallback(() => {
    if (!canUseSpeechRecognition) {
      alert("このブラウザでは音声入力を利用できません。");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      addMemo(transcript);
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
  }, [addMemo, canUseSpeechRecognition, isListening]);

  const handleGenerateSummary = useCallback(() => {
    alert(`【ダミー】AIでまとめ日記を作成します:\n\n${dailyMemos.join("\n")}`);
  }, [dailyMemos]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f9fafb" }}>
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
                  background: "#fff",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  color: "#333",
                }}
              >
                {memo}
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
          }}
          onClick={handleGenerateSummary}
        >
          ✨ 今日のまとめ日記をAIで作成
        </button>
      </div>
    </div>
  );
}
