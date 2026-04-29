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
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#ffeef5] via-[#fff3f8] to-[#fff9fc]">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col px-3 pb-28 pt-5">
        <div className="text-center font-bold text-red-500 py-4">
          【バージョン3：奥行きスタック＆雲UI テスト中】
        </div>
        <div className="mx-auto mb-3 w-fit rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-[#b98795]">
          カードUIテスト中2
        </div>

        <div className="relative mx-auto h-[80%] w-full">
          {/* Back card: photo mode */}
          <motion.section
            animate={
              customerFront
                ? { x: 0, y: -20, scale: 0.95, opacity: 0.88 }
                : { x: 0, y: 0, scale: 1, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="absolute inset-x-2 top-7 bottom-0 rounded-[30px] border border-[#f5dfea] bg-gradient-to-b from-[#fffefe] to-[#fff7fb] p-4 pt-8 shadow-[0_22px_40px_rgba(230,159,185,0.24)]"
            style={{ zIndex: customerFront ? 0 : 10, transformOrigin: "center top" }}
          >
            <button
              type="button"
              onClick={swapCards}
              className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-[#f8ddeb] bg-white px-5 py-1.5 text-base font-black text-[#e28aa4] shadow-[0_10px_18px_rgba(232,153,182,0.25)]"
              aria-label="写メカードを前面にする"
            >
              📷
            </button>
            <h3 className="mb-4 text-[15px] font-extrabold text-[#b57085]">写メ日記モード</h3>
            <div className="grid h-[340px] place-items-center rounded-3xl border-2 border-dashed border-[#f4d7e5] bg-gradient-to-b from-[#fff6fb] to-white text-center">
              <div className="px-4">
                <div className="mb-2 text-4xl">📸</div>
                <p className="text-[14px] font-bold text-[#c27d92]">大きな写真アップロード枠</p>
                <p className="mt-1 text-[11px] text-[#d19caf]">SNS / ブログ用の写真をここに配置</p>
              </div>
            </div>
          </motion.section>

          {/* Front card: customer mode */}
          <motion.section
            animate={
              customerFront
                ? { x: 0, y: 0, scale: 1, rotateX: 0, opacity: 1 }
                : { x: 0, y: 14, scale: 0.97, rotateX: 2, opacity: 0.78 }
            }
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="absolute inset-0 rounded-[30px] border border-[#f3dce8] bg-white p-4 shadow-[0_25px_45px_rgba(223,138,165,0.22)]"
            style={{ zIndex: customerFront ? 20 : 0, transformOrigin: "center top" }}
            drag={customerFront ? "x" : false}
            dragConstraints={{ left: -140, right: 140 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if (customerFront && Math.abs(info.offset.x) > 70) swapCards();
            }}
          >
            <h2 className="mb-3 text-[18px] font-black text-[#b86f86]">👤 誰に送る？</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="顧客を検索..."
              className="w-full rounded-2xl border border-[#f4dcea] bg-[#fff8fc] px-4 py-3 text-[13px] text-[#946a79] outline-none"
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
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                className="relative mt-4 rounded-3xl bg-white/80 p-4 backdrop-blur-sm"
                style={{ boxShadow: "0 12px 28px rgba(255,255,255,0.95), 0 10px 30px rgba(231,171,191,0.28)" }}
              >
                <p className="mb-1.5 text-[12px] font-extrabold text-[#be768d]">☁️ 過去エピソード</p>
                <p className="text-[12px] leading-relaxed text-[#594d52]">{selected.episode}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-[#f8dce7] bg-[#ffeef4] px-2 py-1 text-[11px] font-bold text-[#8b6170]">
                    お気に入りムード：清楚
                  </span>
                  <span className="rounded-full border border-[#f8dce7] bg-[#ffeef4] px-2 py-1 text-[11px] font-bold text-[#8b6170]">
                    事実タグ：#初来店
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="エピソードを追加"
                  className="absolute -right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white text-xl font-bold text-[#d87f9a] shadow-[0_8px_18px_rgba(216,127,154,0.25)]"
                >
                  ＋
                </button>
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
