"use client";

export interface StyleOnboardingModalProps {
  isOpen: boolean;
  lineText: string;
  onLineTextChange: (value: string) => void;
  onBackdropClose: () => void;
  onSubmit: () => void;
}

const LINE_PLACEHOLDER =
  "（例）今日はいっぱい飲んでくれてありがとー！😹🥂 めっちゃ楽しかったよ！また来週も待ってるね🎀";

export function StyleOnboardingModal({
  isOpen,
  lineText,
  onLineTextChange,
  onBackdropClose,
  onSubmit,
}: StyleOnboardingModalProps) {
  return (
    <div
      id="onboardingStyleModal"
      className="modal-overlay"
      style={{ display: isOpen ? "flex" : "none" }}
      onClick={onBackdropClose}
    >
      <div className="modal-content style-modal-content" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ margin: "0 0 10px", fontWeight: "700", textAlign: "center" }}>💬 いつものLINEを貼り付けて教える</h2>
        <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--text-sub)", fontWeight: "600", lineHeight: 1.6 }}>
          いつもの言い回し・絵文字・NGワードを書いておくと、分身AIがあなたの口調を学習します。
        </p>
        <textarea
          id="onboardingStyleText"
          className="input-field"
          placeholder={LINE_PLACEHOLDER}
          value={lineText}
          onChange={(event) => onLineTextChange(event.target.value)}
          onBlur={() => window.scrollTo(0, 0)}
          style={{ minHeight: "220px", marginBottom: "14px", fontSize: "13px", background: "#FFF", border: "1px solid var(--border-color)" }}
        />
        <button
          type="button"
          onClick={onSubmit}
          style={{
            width: "100%",
            background: "var(--text-main)",
            color: "#FFF",
            border: "none",
            padding: "14px",
            borderRadius: "20px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          保存して閉じる
        </button>
      </div>
    </div>
  );
}
