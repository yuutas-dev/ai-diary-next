"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const MOCK_AVATARS = [
  { id: "a1", name: "たかし", emoji: "🧑🏻" },
  { id: "a2", name: "ゆうすけ", emoji: "👨🏼" },
  { id: "a3", name: "まなみ", emoji: "👩🏻" },
  { id: "a4", name: "あや", emoji: "👩🏽" },
  { id: "a5", name: "りな", emoji: "👩🏼" },
];

export default function UiCardRefactorPage() {
  const [activeCard, setActiveCard] = useState<"front" | "back">("front");
  const [isVisitMode, setIsVisitMode] = useState(true);
  const isFrontActive = activeCard === "front";
  const SWIPE_THRESHOLD = 90;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#fdeef4]">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col px-3 pt-6">
        <div className="relative mx-auto mt-8 h-[65vh] w-[85vw] max-w-[370px]">
          <motion.section
            animate={
              isFrontActive
                ? { x: 0, y: -65, scale: 0.9, opacity: 0.92, filter: "brightness(0.95)" }
                : { x: 0, y: 0, scale: 1, opacity: 1, filter: "brightness(1)" }
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
                ? { x: 0, y: 0, scale: 1, opacity: 1, filter: "brightness(1)" }
                : { x: 0, y: -65, scale: 0.9, opacity: 0.92, filter: "brightness(0.95)" }
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
            <div className="flex h-full min-h-0 flex-col rounded-[30px] p-4">
              <div className="rounded-[24px] p-1">
                <div className="w-full rounded-xl bg-gray-100/50 px-3 py-2 text-[12px] text-[#b08a98]">
                  検索...
                </div>
                <div className="mt-3 px-1 py-1">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {MOCK_AVATARS.map((avatar) => (
                      <div key={avatar.id} className="flex min-w-[58px] flex-col items-center">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f3e6ed] text-[20px]">
                          {avatar.emoji}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-[#9f7887]">{avatar.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-[1px] w-[90%] self-center bg-gray-100" />

              <div className="relative mt-3 flex min-h-0 flex-1 flex-col">
                <div className="shrink-0">
                  <div className="mb-2 text-[10px] font-semibold tracking-wide text-gray-400">プロフィールサマリー</div>
                  <div className="flex flex-wrap gap-2">
                    {["ドンペリ好き", "毎週金曜", "長文NG"].map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="space-y-3 pb-16 text-sm text-gray-600">
                    <p>10/12: 「シャンパン 嬉しい」</p>
                    <p>10/08: 「ゴルフの話。少し疲れた」</p>
                    <p>10/01: 「初指名。大人しい人」</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="absolute bottom-1 right-1 flex items-center rounded-full border border-white/70 bg-white/60 px-1.5 py-1 text-[13px] text-[#8f6f7a] backdrop-blur-md"
                >
                  <span className="px-2 font-bold">＋</span>
                  <span className="h-4 w-px bg-[#e8dce3]" />
                  <span className="px-2">🎙️</span>
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-[#fff9fcf0] to-[#fff9fc] px-3 pb-[calc(max(10px,env(safe-area-inset-bottom))+8px)] pt-2.5">
        <div className="mx-auto max-w-[430px]">
          <div className="mb-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsVisitMode((v) => !v)}
              className={`relative h-6 w-10 rounded-full transition-colors ${isVisitMode ? "bg-[#df8a9b]" : "bg-gray-300"}`}
              aria-label="来店トグル"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isVisitMode ? "translate-x-[18px]" : "translate-x-[2px]"}`}
              />
            </button>
            <span className="text-[12px] font-semibold text-[#7b666d]">
              {isVisitMode ? "ありがとうをつたえる" : "きてほしいをつたえる"}
            </span>
          </div>
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
