"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function UiCardRefactorPage() {
  const [activeCard, setActiveCard] = useState<"customer" | "photo">("customer");
  const isCustomerFront = activeCard === "customer";

  return (
    <div className="fixed inset-0 z-[9999] bg-[#fdeef4]">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col px-3 pt-6">
        <div className="relative mx-auto mt-2 h-[55vh] w-[85vw] max-w-[370px]">
          <motion.section
            animate={
              isCustomerFront
                ? { y: -40, scale: 0.85, opacity: 0.92 }
                : { y: 0, scale: 1, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 100, damping: 15, mass: 0.95 }}
            className="absolute inset-0 rounded-[30px] border border-[#f5dfea] bg-white shadow-2xl"
            style={{ zIndex: isCustomerFront ? 0 : 10 }}
            onClick={() => {
              if (isCustomerFront) setActiveCard("photo");
            }}
            drag={!isCustomerFront ? "x" : false}
            dragConstraints={{ left: -120, right: 120 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (!isCustomerFront && Math.abs(info.offset.x) > 70) {
                setActiveCard("customer");
              }
            }}
          >
            <div
              className={`absolute -top-5 right-6 rounded-2xl border border-[#f7deea] bg-white px-4 py-2 text-[12px] font-black text-[#de86a1] shadow-[0_10px_18px_rgba(232,153,182,0.3)] ${
                isCustomerFront ? "pointer-events-auto" : "pointer-events-none"
              }`}
            >
              📷 写メ
            </div>
            <div className="grid h-full place-items-center rounded-[30px] text-center">
              <p className="text-xl font-black text-[#cb7f95]">背面カード</p>
            </div>
          </motion.section>

          <motion.section
            animate={
              isCustomerFront
                ? { y: 0, scale: 1, opacity: 1 }
                : { y: -40, scale: 0.85, opacity: 0.92 }
            }
            transition={{ type: "spring", stiffness: 100, damping: 15, mass: 0.95 }}
            className="absolute inset-0 rounded-[30px] border border-[#f3dce8] bg-white shadow-2xl"
            style={{ zIndex: isCustomerFront ? 10 : 0 }}
            onClick={() => {
              if (!isCustomerFront) setActiveCard("customer");
            }}
            drag={isCustomerFront ? "x" : false}
            dragConstraints={{ left: -120, right: 120 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (isCustomerFront && Math.abs(info.offset.x) > 70) {
                setActiveCard("photo");
              }
            }}
          >
            <div
              className={`absolute -top-5 left-6 rounded-2xl border border-[#f7deea] bg-white px-4 py-2 text-[12px] font-black text-[#de86a1] shadow-[0_10px_18px_rgba(232,153,182,0.3)] ${
                isCustomerFront ? "pointer-events-none" : "pointer-events-auto"
              }`}
            >
              👤 顧客
            </div>
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
