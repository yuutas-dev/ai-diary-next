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

  // マイクのインスタンスを保持するRef
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // ==========================================
  // 1. 初期化処理（LocalStorage復元 ＆ APIセット）
  // ==========================================
  useEffect(() => {
    // SSR回避
    if (typeof window === "undefined") return;

    // LocalStorageからの復元
    try {
      const stored = window.localStorage.getItem("fuzoku_daily_memos");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDailyMemos(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch (e) {
      console.error("LocalStorage load error:", e);
    } finally {
      setIsHydrated(true);
    }

    // SpeechRecognitionの準備（まだ起動しない）
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
    }
  }, []);

  // ==========================================
  // 2. データ保存（Stateが変わるたびにStorageへ）
  // ==========================================
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem("fuzoku_daily_memos", JSON.stringify(dailyMemos));
  }, [dailyMemos, isHydrated]);

  // ==========================================
  // 3. メモ追加・削除ロジック
  // ==========================================
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

  // ==========================================
  // 4. 音声認識ロジック
  // ==========================================
  const handleCancelListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleStartListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("お使いのブラウザは音声入力に対応していません（SafariやChromeをお試しください）。");
      return;
    }

    // すでに起動中なら停止する（トグル動作）
    if (isListening) {
      handleCancelListening();
      return;
    }

    // APIの設定
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

    recognition.onerror = (e) => {
      console.error("Speech recognition error", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      // 連続でstartを呼んだ場合のエラー回避
      console.error(e);
      setIsListening(false);
    }
  }, [isListening, addMemo, handleCancelListening]);

  // ==========================================
  // 5. ダミー出力ロジック
  // ==========================================
  const handleGenerateSummary = useCallback(() => {
    if (dailyMemos.length === 0) {
      alert("メモがありません。まずはメモを追加してください。");
      return;
    }
    alert(`【ダミー生成】\n\n${dailyMemos.join("\n")}\n\n※ここにAIが生成したブログ記事が表示されます。`);
  }, [dailyMemos]);

  // Hydrationエラー防止
  if (!isHydrated) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f9fafb" }}>
      {/* --- CSSアニメーション定義 --- */}
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
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  background: "#fff",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <span style={{ color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>{memo}</span>
                <button
                  onClick={() => handleDeleteMemo(idx)}
                  style={{ background: "none", border: "none", color: "#ccc", fontSize: "20px", padding: "0 4px", cursor: "pointer" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- 下部：入力・アクションエリア --- */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #eee",
          padding: "16px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))", // iPhoneのホームバー対策
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
          
          {/* マイクボタン（単独で大きく配置） */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "-40px" }}>
            <button
              onClick={handleStartListening}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "none",
                background: "#111827",
                color: "#fff",
                fontSize: "28px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              🎤
            </button>
          </div>

          {/* テキスト入力エリア */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="手入力でメモを追加..."
              style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
              onKeyDown={(e) => e.key === "Enter" && handleAddTypedMemo()}
            />
            <button
              onClick={handleAddTypedMemo}
              style={{ padding: "0 20px", background: "#3b82f6", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold" }}
            >
              追加
            </button>
          </div>
        </div>

        {/* 生成ボタン */}
        <button
          onClick={handleGenerateSummary}
          style={{ width: "100%", padding: "16px", background: "#f472b6", color: "#fff", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
        >
          ✨ 今日のまとめ日記をAIで作成
        </button>
      </div>

      {/* --- 没入型：録音中オーバーレイ --- */}
      {isListening && (
        <div
          onClick={handleCancelListening} // 背景タップでキャンセル
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999, // 最前面
          }}
        >
          <div style={{ fontSize: "100px", animation: "listeningPulse 1.2s infinite" }}>🎤</div>
          <div style={{ color: "#fff", fontSize: "24px", fontWeight: "bold", marginTop: "20px" }}>ききとりちゅう...</div>
          <div style={{ color: "#aaa", fontSize: "14px", marginTop: "12px" }}>喋り終わると自動で追加されます</div>
          <button
            onClick={(e) => {
              e.stopPropagation(); // 背景タップのイベント伝播を防ぐ
              handleCancelListening();
            }}
            style={{ marginTop: "40px", padding: "12px 24px", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", fontSize: "16px", cursor: "pointer" }}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
