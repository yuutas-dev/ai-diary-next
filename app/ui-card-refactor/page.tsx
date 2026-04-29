"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function UiCardRefactorPage() {
  const [frontMode, setFrontMode] = useState<"front" | "back">("front");
  const swapCards = () => setFrontMode((v) => (v === "front" ? "back" : "front"));
  const isFrontCardOnTop = frontMode === "front";

  return (
    <div className="fixed inset-0 z-[9999] bg-[#fdeef4]">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col px-3 pt-6">
        <div className="relative mx-auto h-[80%] w-[90vw] max-w-[390px]">
          <motion.section
            animate={
              isFrontCardOnTop
                ? { x: 0, y: -18, scale: 0.95, opacity: 0.92 }
                : { x: 0, y: 0, scale: 1, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 110, damping: 16, mass: 0.9 }}
            className="absolute inset-0 rounded-[30px] border border-[#f5dfea] bg-white shadow-[0_28px_52px_rgba(230,159,185,0.35)]"
            style={{ zIndex: isFrontCardOnTop ? 0 : 10 }}
          >
            <button
              type="button"
              onClick={swapCards}
              className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-[#f7deea] bg-white px-5 py-1.5 text-base font-black text-[#de86a1] shadow-[0_10px_18px_rgba(232,153,182,0.3)]"
              aria-label="背面カードを前面へ"
            >
              📷
            </button>
            <div className="grid h-full place-items-center rounded-[30px] text-center">
              <p className="text-xl font-black text-[#cb7f95]">背面カード</p>
            </div>
          </motion.section>

          <motion.section
            animate={
              isFrontCardOnTop
                ? { x: 0, y: 0, scale: 1, opacity: 1 }
                : { x: 0, y: 14, scale: 0.97, opacity: 0.78 }
            }
            transition={{ type: "spring", stiffness: 110, damping: 16, mass: 0.9 }}
            className="absolute inset-0 rounded-[30px] border border-[#f3dce8] bg-white shadow-[0_24px_45px_rgba(223,138,165,0.25)]"
            style={{ zIndex: isFrontCardOnTop ? 10 : 0 }}
            drag={isFrontCardOnTop ? "x" : false}
            dragConstraints={{ left: -140, right: 140 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if (isFrontCardOnTop && Math.abs(info.offset.x) > 70) {
                setFrontMode("back");
              }
            }}
          >
            <div className="grid h-full place-items-center rounded-[30px] text-center">
              <p className="text-xl font-black text-[#cb7f95]">前面カード</p>
            </div>
          </motion.section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-[#fff9fcf0] to-[#fff9fc] px-3 pb-[calc(max(10px,env(safe-area-inset-bottom))+8px)] pt-2.5">
        <div className="mx-auto max-w-[430px]">
          <button
            type="button"
            className="w-full rounded-full border-none bg-gradient-to-br from-[#df8a9b] to-[#ec9aae] px-4 py-3 text-[15px] font-extrabold text-white shadow-[0_14px_24px_rgba(223,138,155,0.34)]"
          >
            ✨ AIで作成（お手紙）
          </button>
          <div className="mt-2.5 grid grid-cols-3 rounded-2xl border border-[#f0dce5] bg-white/85 px-2 py-2 text-center text-[12px] font-bold text-[#7b666d] shadow-[0_8px_18px_rgba(190,137,153,0.14)]">
            <div>📝 作成</div>
            <div>📖 顧客</div>
            <div>⚙️ 設定</div>
          </div>
        </div>
      </div>
    </div>
  );
}
