"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type MockCustomer = {
  id: string;
  name: string;
  imageUrl: string;
  episode: string;
};

const MOCK_CUSTOMERS: MockCustomer[] = [
  {
    id: "u1",
    name: "たかし",
    imageUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Takashi",
    episode: "前回はゆるめの雰囲気が好印象。冒頭で軽い感謝を入れると返信率が高め。",
  },
  {
    id: "u2",
    name: "ゆうすけ",
    imageUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Yusuke",
    episode: "短文+絵文字2つが刺さりやすいタイプ。夜帯の送信が相性よさそう。",
  },
  {
    id: "u3",
    name: "まなみ",
    imageUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Manami",
    episode: "丁寧語のトーンで安定。次回予定を一言添えると会話が続きやすい。",
  },
  {
    id: "u4",
    name: "あや",
    imageUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Aya",
    episode: "親しみを出すなら呼びかけが効果的。最後はやわらかい締めがベター。",
  },
];

export default function UiCardRefactorPage() {
  const [frontCard, setFrontCard] = useState<"customer" | "photo">("customer");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(MOCK_CUSTOMERS[0].id);

  const list = useMemo(() => {
    const q = query.trim();
    if (!q) return MOCK_CUSTOMERS;
    return MOCK_CUSTOMERS.filter((c) => c.name.includes(q));
  }, [query]);

  const selected = list.find((c) => c.id === selectedId) || MOCK_CUSTOMERS.find((c) => c.id === selectedId);
  const swapCards = () => setFrontCard((v) => (v === "customer" ? "photo" : "customer"));

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#fceef0]">
      <main className="mx-auto min-h-dvh w-full max-w-[430px] px-3 pb-28 pt-4">
        <p className="mb-3 text-[11px] font-bold text-[#8f7a80]">カードUIテスト中</p>

        <div className="relative h-[560px]">
          <motion.section
            animate={frontCard === "customer" ? { y: 0, scale: 1, opacity: 1 } : { y: 20, scale: 0.965, opacity: 0.82 }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
            className="absolute inset-0 rounded-[24px] border border-[#f2dde5] bg-white p-4 shadow-[0_16px_34px_rgba(198,134,151,0.18)]"
            style={{ zIndex: frontCard === "customer" ? 30 : 8 }}
            drag={frontCard === "customer" ? "y" : false}
            dragConstraints={{ top: 0, bottom: 130 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 70) swapCards();
            }}
          >
            <h2 className="mb-3 text-base font-extrabold text-[#4a3f43]">👤 誰に送る？</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="顧客を検索..."
              className="w-full rounded-xl border border-[#edd9e1] bg-[#fff8fb] px-3 py-2.5 text-[13px] text-[#564a4f] outline-none"
            />

            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {list.map((c) => {
                const active = selectedId === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setSelectedId(c.id)} className="min-w-[62px]">
                    <div
                      className="mx-auto h-[58px] w-[58px] overflow-hidden rounded-full bg-[#fff3f8]"
                      style={{
                        border: active ? "2px solid #df8a9b" : "1px solid #f0dee5",
                        boxShadow: active ? "0 6px 14px rgba(223,138,155,0.30)" : "none",
                      }}
                    >
                      <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-1.5 text-center text-[11px] font-bold text-[#6b5d62]">{c.name}</p>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.24 }}
                  className="mt-4 rounded-2xl border border-[#f0dde5] bg-gradient-to-b from-[#fff6fa] to-white p-3"
                >
                  <p className="mb-1.5 text-[12px] font-extrabold text-[#815f69]">📖 過去エピソード</p>
                  <p className="text-[12px] leading-relaxed text-[#594d52]">{selected.episode}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-[#f8dce7] bg-[#ffeef4] px-2 py-1 text-[11px] font-bold text-[#8b6170]">
                      お気に入りムード：清楚
                    </span>
                    <span className="rounded-full border border-[#f8dce7] bg-[#ffeef4] px-2 py-1 text-[11px] font-bold text-[#8b6170]">
                      事実タグ：#初来店
                    </span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>

          <motion.section
            animate={frontCard === "photo" ? { y: 0, scale: 1, opacity: 1 } : { y: 24, scale: 0.96, opacity: 0.85 }}
            transition={{ type: "spring", stiffness: 180, damping: 26 }}
            className="absolute inset-x-2 top-6 bottom-0 rounded-[24px] border border-[#f4e3ea] bg-gradient-to-b from-[#fffefe] to-[#fff8fb] p-4 pt-7 shadow-[0_14px_30px_rgba(188,138,151,0.16)]"
            style={{ zIndex: frontCard === "photo" ? 35 : 5 }}
          >
            <button
              type="button"
              onClick={swapCards}
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-[#f2dce5] bg-[#fff4f8] px-4 py-1.5 text-sm font-extrabold text-[#c86f87] shadow-[0_6px_16px_rgba(205,130,151,0.23)]"
            >
              📷
            </button>
            <h3 className="mb-3 text-[15px] font-extrabold text-[#4c4044]">写メ日記カード</h3>
            <div className="grid h-[330px] place-items-center rounded-2xl border-2 border-dashed border-[#e8cad7] bg-gradient-to-b from-[#fff6fa] to-white p-3 text-center text-[13px] font-bold text-[#9c727e]">
              <div>
                <div className="mb-2 text-[30px]">🖼️</div>
                大きな写真アップロード枠
                <p className="mt-1.5 text-[11px] text-[#ae8590]">SNS / ブログ用の画像をここに配置</p>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-[#fff9fcf0] to-[#fff9fc] px-3 pb-[calc(max(10px,env(safe-area-inset-bottom))+8px)] pt-2.5">
        <div className="mx-auto max-w-[430px]">
          <button
            type="button"
            className="w-full rounded-full border-none bg-gradient-to-br from-[#df8a9b] to-[#ec9aae] px-4 py-3 text-sm font-extrabold text-white shadow-[0_14px_24px_rgba(223,138,155,0.34)]"
          >
            ✨ AIで作成する
          </button>
        </div>
      </div>
    </div>
  );
}
