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
    imageUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Takashi",
    episode: "前回はやわらかいトーンが好印象。冒頭に短い感謝を入れると返信率が上がりやすいです。",
  },
  {
    id: "u2",
    name: "ゆうすけ",
    imageUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Yusuke",
    episode: "短文＋絵文字2つが刺さりやすいタイプ。夜帯の送信が相性よさそうです。",
  },
  {
    id: "u3",
    name: "まなみ",
    imageUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Manami",
    episode: "丁寧語トーンで安定。次回予定を一言添えると会話が続きやすいです。",
  },
  {
    id: "u4",
    name: "あや",
    imageUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Aya",
    episode: "親しみを出すなら呼びかけが効果的。締めはやわらかい余韻がベターです。",
  },
];

export default function UiCardRefactorPage() {
  const [frontMode, setFrontMode] = useState<"customer" | "photo">("customer");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(MOCK_CUSTOMERS[0].id);

  const list = useMemo(() => {
    const q = query.trim();
    if (!q) return MOCK_CUSTOMERS;
    return MOCK_CUSTOMERS.filter((c) => c.name.includes(q));
  }, [query]);

  const selected = list.find((c) => c.id === selectedId) ?? MOCK_CUSTOMERS[0];
  const swapCards = () => setFrontMode((v) => (v === "customer" ? "photo" : "customer"));
  const customerFront = frontMode === "customer";

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#fceef0]">
      <main className="mx-auto min-h-dvh w-full max-w-[430px] px-3 pb-28 pt-5">
        <div className="mx-auto mb-3 w-fit rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-[#9b7883]">
          カードUIテスト中2
        </div>

        <div className="relative h-[590px]">
          {/* Back card: photo mode */}
          <motion.section
            animate={
              customerFront
                ? { y: 34, scale: 0.95, rotateX: 5, opacity: 0.72 }
                : { y: 0, scale: 1, rotateX: 0, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="absolute inset-x-2 top-7 bottom-0 rounded-[28px] border border-[#f0dde5] bg-gradient-to-b from-white to-[#fff9fc] p-4 pt-8 shadow-[0_20px_40px_rgba(188,138,151,0.22)]"
            style={{ zIndex: customerFront ? 10 : 30, transformOrigin: "center top" }}
          >
            <button
              type="button"
              onClick={swapCards}
              className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-[#f2dce5] bg-[#fff4f8] px-5 py-1.5 text-base font-black text-[#d1718c] shadow-[0_8px_18px_rgba(205,130,151,0.25)]"
              aria-label="写メカードを前面にする"
            >
              📷
            </button>
            <h3 className="mb-4 text-[15px] font-extrabold text-[#4d4045]">写メ日記モード</h3>
            <div className="grid h-[340px] place-items-center rounded-2xl border-2 border-dashed border-[#e8c9d6] bg-gradient-to-b from-[#fff5fa] to-white text-center">
              <div className="px-4">
                <div className="mb-2 text-4xl">🖼️</div>
                <p className="text-[14px] font-bold text-[#8f6976]">大きな写真アップロード枠</p>
                <p className="mt-1 text-[11px] text-[#b38a96]">SNS / ブログ用の写真をここに配置</p>
              </div>
            </div>
          </motion.section>

          {/* Front card: customer mode */}
          <motion.section
            animate={
              customerFront
                ? { y: 0, scale: 1, rotateX: 0, opacity: 1 }
                : { y: 22, scale: 0.965, rotateX: 4, opacity: 0.76 }
            }
            transition={{ type: "spring", stiffness: 210, damping: 24 }}
            className="absolute inset-0 rounded-[28px] border border-[#f1dde6] bg-white p-4 shadow-[0_24px_45px_rgba(198,134,151,0.2)]"
            style={{ zIndex: customerFront ? 30 : 10, transformOrigin: "center top" }}
            drag={customerFront ? "y" : false}
            dragConstraints={{ top: 0, bottom: 160 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (customerFront && info.offset.y > 80) swapCards();
            }}
          >
            <h2 className="mb-3 text-[18px] font-black text-[#4a3f43]">👤 誰に送る？</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="顧客を検索..."
              className="w-full rounded-2xl border border-[#edd9e1] bg-[#fff8fb] px-4 py-3 text-[13px] text-[#564a4f] outline-none"
            />

            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {list.map((c) => {
                const active = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="min-w-[70px]"
                  >
                    <div
                      className="mx-auto h-[62px] w-[62px] overflow-hidden rounded-full bg-[#fff3f8]"
                      style={{
                        border: active ? "2.5px solid #df8a9b" : "1px solid #f0dee5",
                        boxShadow: active ? "0 8px 16px rgba(223,138,155,0.28)" : "none",
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
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
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
            </AnimatePresence>
          </motion.section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-[#fff9fcf0] to-[#fff9fc] px-3 pb-[calc(max(10px,env(safe-area-inset-bottom))+8px)] pt-2.5">
        <div className="mx-auto max-w-[430px]">
          <button
            type="button"
            className="w-full rounded-full border-none bg-gradient-to-br from-[#df8a9b] to-[#ec9aae] px-4 py-3 text-[15px] font-extrabold text-white shadow-[0_14px_24px_rgba(223,138,155,0.34)]"
          >
            ✨ AIで作成する
          </button>
        </div>
      </div>
    </div>
  );
}
