"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MOCK_AVATARS = [
  { id: "a1", name: "たかし", emoji: "🧑🏻" },
  { id: "a2", name: "ゆうすけ", emoji: "👨🏼" },
  { id: "a3", name: "まなみ", emoji: "👩🏻" },
  { id: "a4", name: "あや", emoji: "👩🏽" },
  { id: "a5", name: "りな", emoji: "👩🏼" },
];

type MockEpisode = { id: string; dateLabel: string; body: string };

type CustomerMockProfile = {
  customerId: string;
  profileTags: string[];
  episodes: MockEpisode[];
};

/** 顧客A/B/C + その他（モック・DBなし） */
const MOCK_CUSTOMER_PROFILES: Record<string, CustomerMockProfile> = {
  a1: {
    customerId: "a1",
    profileTags: ["ドンペリ好き"],
    episodes: [
      { id: "a1-e1", dateLabel: "10/08", body: "ゴルフの話" },
      { id: "a1-e2", dateLabel: "10/12", body: "シャンパン 嬉しい" },
    ],
  },
  a2: {
    customerId: "a2",
    profileTags: ["毎週金曜"],
    episodes: [
      { id: "a2-e1", dateLabel: "10/03", body: "犬の話題" },
      { id: "a2-e2", dateLabel: "10/10", body: "焼き鳥 美味しかった" },
    ],
  },
  a3: {
    customerId: "a3",
    profileTags: ["長文NG"],
    episodes: [
      { id: "a3-e1", dateLabel: "10/05", body: "初来店" },
      { id: "a3-e2", dateLabel: "10/11", body: "清楚" },
    ],
  },
  a4: {
    customerId: "a4",
    profileTags: ["ワイン派", "仕事の話OK"],
    episodes: [
      { id: "a4-e1", dateLabel: "10/07", body: "誕生日が近い" },
      { id: "a4-e2", dateLabel: "10/14", body: "お酒弱め" },
    ],
  },
  a5: {
    customerId: "a5",
    profileTags: ["カラオケ好き", "連絡マメ"],
    episodes: [
      { id: "a5-e1", dateLabel: "09/30", body: "お礼LINEきた" },
      { id: "a5-e2", dateLabel: "10/09", body: "次の予約入れた" },
    ],
  },
};

function formatEpisodeDateLabel(d = new Date()) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTodayJa() {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

export default function UiCardRefactorPage() {
  const [activeCard, setActiveCard] = useState<"front" | "back">("front");
  const [isVisitMode, setIsVisitMode] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(MOCK_AVATARS[0].id);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [isEpisodeComposerOpen, setIsEpisodeComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [userEpisodesByCustomer, setUserEpisodesByCustomer] = useState<Record<string, MockEpisode[]>>({});
  const episodeScrollRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const isFrontActive = activeCard === "front";
  const SWIPE_THRESHOLD = 90;
  const todayLabel = useMemo(() => formatTodayJa(), []);

  const selectedCustomer = MOCK_AVATARS.find((a) => a.id === selectedCustomerId) ?? MOCK_AVATARS[0];
  const selectedProfile =
    MOCK_CUSTOMER_PROFILES[selectedCustomerId] ?? MOCK_CUSTOMER_PROFILES[MOCK_AVATARS[0].id];
  const userExtraEpisodes = userEpisodesByCustomer[selectedCustomerId] ?? [];
  const displayedEpisodes = useMemo(
    () => [...selectedProfile.episodes, ...userExtraEpisodes],
    [selectedProfile.episodes, userExtraEpisodes],
  );

  const createButtonLabel = isVisitMode
    ? `${selectedCustomer.name}さんにありがとうを伝える（AI）`
    : `${selectedCustomer.name}さんにきてほしいと伝える（AI）`;

  useEffect(() => {
    if (!isEpisodeComposerOpen) return;
    const id = window.requestAnimationFrame(() => {
      composerInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [isEpisodeComposerOpen]);

  const commitComposerEpisode = () => {
    const body = composerText.trim();
    if (!body) return;
    const newEp: MockEpisode = {
      id: `user-${selectedCustomerId}-${Date.now()}`,
      dateLabel: formatEpisodeDateLabel(),
      body,
    };
    setUserEpisodesByCustomer((prev) => ({
      ...prev,
      [selectedCustomerId]: [...(prev[selectedCustomerId] ?? []), newEp],
    }));
    setComposerText("");
    setIsEpisodeComposerOpen(false);
    composerInputRef.current?.blur();
    queueMicrotask(() => {
      const el = episodeScrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  const closeComposer = () => {
    setIsEpisodeComposerOpen(false);
    setComposerText("");
    composerInputRef.current?.blur();
  };

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
            drag={!isFrontActive && !isVoiceInputActive && !isEpisodeComposerOpen ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            whileDrag={{ scale: 0.98 }}
            onDragEnd={(_, info) => {
              if (
                !isFrontActive &&
                !isVoiceInputActive &&
                !isEpisodeComposerOpen &&
                Math.abs(info.offset.x) > SWIPE_THRESHOLD
              ) {
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
            drag={isFrontActive && !isVoiceInputActive && !isEpisodeComposerOpen ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            whileDrag={{ scale: 0.98 }}
            onDragEnd={(_, info) => {
              if (
                isFrontActive &&
                !isVoiceInputActive &&
                !isEpisodeComposerOpen &&
                Math.abs(info.offset.x) > SWIPE_THRESHOLD
              ) {
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
                    {MOCK_AVATARS.map((avatar) => {
                      const isSelected = selectedCustomerId === avatar.id;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedCustomerId(avatar.id)}
                          className="flex min-w-[58px] flex-col items-center border-none bg-transparent p-0"
                        >
                          <div
                            className={`grid h-11 w-11 place-items-center rounded-full text-[20px] ${
                              isSelected ? "bg-[#f0d6e3]" : "bg-[#f3e6ed]"
                            }`}
                          >
                            {avatar.emoji}
                          </div>
                          <div className="mt-1 text-[10px] font-bold text-[#9f7887]">{avatar.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-[1px] w-[90%] self-center bg-gray-100" />

              <div className="relative mt-3 flex min-h-0 flex-1 flex-col">
                <div className="shrink-0">
                  <div className="mb-2 text-[10px] font-semibold tracking-wide text-gray-400">プロフィールサマリー</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.profileTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  ref={episodeScrollRef}
                  className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <motion.div
                    key={selectedCustomerId}
                    className="space-y-3 pb-16 text-sm text-gray-600"
                    animate={{ y: isVoiceInputActive ? -52 : 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 32 }}
                  >
                    {displayedEpisodes.map((ep) => (
                      <motion.p
                        key={ep.id}
                        initial={ep.id.startsWith("user-") ? { opacity: 0, y: 10 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="border-none bg-transparent text-left text-sm font-normal text-gray-600 shadow-none"
                      >
                        {ep.dateLabel}: 「{ep.body}」
                      </motion.p>
                    ))}
                  </motion.div>
                </div>

                <div className="absolute bottom-1 right-1 flex items-center overflow-hidden rounded-full border border-white/70 bg-white/60 text-[13px] text-[#8f6f7a] backdrop-blur-md">
                  <button
                    type="button"
                    className="border-none bg-transparent px-2 py-1 font-bold"
                    aria-label="エピソードを追加"
                    onClick={() => setIsEpisodeComposerOpen(true)}
                  >
                    ＋
                  </button>
                  <span className="h-4 w-px shrink-0 bg-[#e8dce3]" aria-hidden />
                  <button
                    type="button"
                    aria-label="音声入力"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setIsVoiceInputActive(true)}
                    className="border-none bg-transparent px-2 py-1"
                  >
                    🎤
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-[#fff9fcf0] to-[#fff9fc] px-3 pb-[calc(max(10px,env(safe-area-inset-bottom))+8px)] pt-2.5">
        <div className="mx-auto max-w-[430px]">
          <div className="mx-auto mb-2 w-[240px] max-w-full rounded-full border border-gray-100 bg-white p-0.5">
            <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-full">
              <button
                type="button"
                onClick={() => setIsVisitMode(true)}
                aria-label="来店あり（ありがとう）"
                className={`min-w-0 px-1 py-1.5 text-center text-[10px] font-bold leading-tight transition-all ${
                  isVisitMode
                    ? "bg-gradient-to-br from-[#df8a9b] to-[#ec9aae] text-white shadow-sm"
                    : "bg-transparent text-gray-500"
                }`}
              >
                ありがとうをつたえる
              </button>
              <button
                type="button"
                onClick={() => setIsVisitMode(false)}
                aria-label="来店なし（きてほしい）"
                className={`min-w-0 px-1 py-1.5 text-center text-[10px] font-bold leading-tight transition-all ${
                  !isVisitMode
                    ? "bg-gradient-to-br from-[#df8a9b] to-[#ec9aae] text-white shadow-sm"
                    : "bg-transparent text-gray-500"
                }`}
              >
                きてほしいをつたえる
              </button>
            </div>
          </div>
          <button
            type="button"
            className="w-full rounded-full border-none bg-gradient-to-br from-[#df8a9b] to-[#ec9aae] px-4 py-3 text-[15px] font-extrabold text-white shadow-[0_14px_24px_rgba(223,138,155,0.34)]"
          >
            {createButtonLabel}
          </button>
          <div className="mt-2.5 grid grid-cols-3 rounded-2xl border border-[#f0dce5] bg-white/85 px-2 py-4 text-center text-[13px] font-bold text-[#7b666d] shadow-[0_8px_18px_rgba(190,137,153,0.14)]">
            <div>📝 作成</div>
            <div>📖 顧客</div>
            <div>⚙️ 設定</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEpisodeComposerOpen ? (
          <>
            <motion.button
              key="episode-composer-backdrop"
              type="button"
              aria-label="入力を閉じる"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[10010] cursor-default border-none bg-black/18 p-0"
              onPointerDown={closeComposer}
            />
            <motion.div
              key="episode-composer-sheet"
              role="dialog"
              aria-label="エピソード入力"
              initial={{ y: "115%" }}
              animate={{ y: 0 }}
              exit={{ y: "115%" }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[10011] mx-auto w-full max-w-[430px]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="rounded-t-[22px] border border-gray-100/90 bg-white px-3 pb-[calc(max(12px,env(safe-area-inset-bottom))+10px)] pt-3 shadow-[0_-14px_44px_rgba(40,20,30,0.12)]">
                <textarea
                  ref={composerInputRef}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  rows={3}
                  enterKeyHint="send"
                  inputMode="text"
                  placeholder="エピソードを入力..."
                  className="min-h-[88px] w-full resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none ring-0 placeholder:text-gray-400"
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeComposer}
                    className="rounded-full border-none bg-gray-100 px-3.5 py-2 text-[13px] font-bold text-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={commitComposerEpisode}
                    className="rounded-full border-none bg-gray-100 px-3.5 py-2 text-[13px] font-bold text-gray-600"
                  >
                    送信
                  </button>
                  <button
                    type="button"
                    onClick={commitComposerEpisode}
                    className="rounded-full border-none bg-gradient-to-br from-[#df8a9b] to-[#ec9aae] px-3.5 py-2 text-[13px] font-bold text-white shadow-sm"
                  >
                    追加
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isVoiceInputActive ? (
          <>
            <motion.button
              key="voice-dismiss-layer"
              type="button"
              aria-label="音声入力を終了"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[10050] cursor-default border-none bg-black/25 p-0 backdrop-blur-md"
              onPointerDown={() => setIsVoiceInputActive(false)}
            />
            <motion.button
              key="voice-highlight"
              type="button"
              aria-label="音声入力を終了"
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onPointerDown={() => setIsVoiceInputActive(false)}
              className="pointer-events-auto fixed left-1/2 z-[10051] w-[min(92vw,380px)] -translate-x-1/2 rounded-[22px] border border-white/90 bg-white px-4 py-3.5 text-left shadow-[0_18px_40px_rgba(40,20,30,0.14),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-8px_24px_rgba(180,140,155,0.12)]"
              style={{ bottom: "max(32%, calc(env(safe-area-inset-bottom) + 200px))" }}
            >
              <div className="text-[11px] font-semibold tracking-wide text-[#b8a0a8]">{todayLabel}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-8 items-end gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      className="block h-5 w-1 origin-bottom rounded-full bg-[#d4c2c8]"
                      animate={{ scaleY: [0.35, 1, 0.45, 0.92, 0.4, 0.78, 0.35] }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: i * 0.08,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[14px] font-medium text-gray-400">ききとりちゅう....</p>
              </div>
            </motion.button>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
