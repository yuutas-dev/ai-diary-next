"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function UiCardRefactorPage() {
  const [activeCard, setActiveCard] = useState<"front" | "back">("front");
  const isFrontActive = activeCard === "front";
  const SWIPE_THRESHOLD = 90;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#fdeef4]">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col px-3 pt-6">
        <div className="relative mx-auto mt-2 h-[55vh] w-[85vw] max-w-[370px]">
          <motion.section
            animate={
              isFrontActive
                ? { x: 0, y: -30, scale: 0.85, opacity: 0.92 }
                : { x: 0, y: 0, scale: 1, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="absolute inset-0 rounded-[30px] border border-[#f5dfea] bg-white shadow-xl"
            style={{ zIndex: isFrontActive ? 0 : 10 }}
            drag={!isFrontActive ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            whileDrag={{ scale: 0.98 }}
            onDragEnd={(_, info) => {
              if (!isFrontActive && Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
                setActiveCard("front");
              }
            }}
          >
            <div className="grid h-full place-items-center rounded-[30px] text-center">
              <p className="text-xl font-black text-[#cb7f95]">背面カード</p>
            </div>
          </motion.section>

          <motion.section
            animate={
              isFrontActive
                ? { x: 0, y: 0, scale: 1, opacity: 1 }
                : { x: 0, y: -30, scale: 0.85, opacity: 0.92 }
            }
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="absolute inset-0 rounded-[30px] border border-[#f3dce8] bg-white shadow-2xl"
            style={{ zIndex: isFrontActive ? 10 : 0 }}
            drag={isFrontActive ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            whileDrag={{ scale: 0.98 }}
            onDragEnd={(_, info) => {
              if (isFrontActive && Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
                setActiveCard("back");
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
          <div className="mt-2.5 grid grid-cols-3 rounded-2xl border border-[#f0dce5] bg-white/85 px-2 py-4 text-center text-[13px] font-bold text-[#7b666d] shadow-[0_8px_18px_rgba(190,137,153,0.14)]">
            <div>📝 作成</div>
            <div>📖 顧客</div>
            <div>⚙️ 設定</div>
          </div>
        </div>
      </div>
    </div>
  );
}
