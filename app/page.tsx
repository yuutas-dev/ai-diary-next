"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiffAuth } from "../hooks/useLiffAuth";
import type { Dispatch, PointerEvent, SetStateAction } from "react";

type ActiveTab = "create" | "data" | "settings";
type CreateMode = "text" | "photo";
type VisitStatus = "yes" | "no";
type StyleTab = "cute" | "custom" | "neat";
type DataView = "customer" | "history";
type BusinessType = "cabaret" | "fuzoku" | "garuba";
type ListFilter = "alert" | "all" | "vip" | "new" | "second" | "regular";
type IconTheme = "glass" | "jewel" | "perfume" | "moon_star" | "flower" | "teacup" | "symbol";
type AppTheme = "pink" | "blue";
type AppFont = "standard" | "maru" | "mincho";

interface MemoBlock {
  id: string;
  entryId?: string | null;
  date: string;
  text: string;
  tags: string[];
  photoUrl?: string;
  type: string;
  status: string;
  isExpanded: boolean;
  isReadOnly: boolean;
  isDropdownOpen: boolean;
}

const HIDDEN_DUMMY_IDS_KEY = "hidden_dummy_customer_ids";

interface CustomerEntry {
  id?: string | null;
  date?: string;
  text?: string;
  tags?: string[];
  photoUrl?: string;
  type?: string;
  status?: string;
  aiGeneratedText?: string;
  ai_generated_text?: string;
  finalSentText?: string;
  final_sent_text?: string;
  inputMemo?: string;
  input_memo?: string;
  entry_date?: string;
}

interface Customer {
  id: string | null;
  name: string;
  memo?: string;
  tags?: string;
  entries: CustomerEntry[];
  tagsArray: string[];
  /** マスターのサンプル顧客（ユーザー編集対象外） */
  isMasterDummy?: boolean;
}

const INDUSTRY_MOOD_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: ["💖 大好き", "✨ 特別な存在", "🥂 一緒に飲みたい", "🥺 早く会いたい", "🤫 ナイショの話", "💕 ずっと一緒にいたい", "🧸 癒やされる", "🍼 頼りにしてる", "💋 ドキドキ", "👗 可愛くなりたい", "🥺 寂しいな", "📱 連絡きて嬉しい", "🖤 独占してほしい", "🎉 楽しすぎた！", "💖 いつもありがとう"],
  fuzoku: ["💖 あなたが特別", "🧸 癒やされた", "🤤 余韻", "💕 相性良すぎ", "🥺 一緒にいたかった", "🤫 2人の秘密", "💋 ドキドキした", "🍼 甘えちゃった", "🖤 独占したい", "🥺 早く会いたい", "✨ 楽しかった", "📱 連絡待ってる", "🥺 依存しちゃいそう", "💖 感謝", "💤 夢で会いたい"],
  garuba: ["🍻 乾杯したい", "✨ 楽しかった", "🥺 また話したい", "🎤 一緒に歌いたい", "💕 気になる", "🤫 2人だけの話", "📱 連絡待ってる", "🧸 癒やされた", "🎉 最高だった", "💖 いつもありがとう", "🥂 また飲もうね", "😂 笑いすぎた", "🥺 会いたい", "🌙 夜更かししたい", "💤 夢で会いたい"],
};

const INDUSTRY_ATTRIBUTE_TAGS: Record<BusinessType, string[]> = {
  cabaret: ["太客", "細客", "常連", "新規", "痛客", "お酒好き", "下戸", "金持ち", "ケチ", "既婚", "独身", "おじさん", "若者", "イケメン", "優しい"],
  fuzoku: ["M気質", "S気質", "常連", "新規", "キモい", "優しい", "痛客", "匂いキツめ", "マナー良", "本番要求", "おじさん", "若者", "イケメン", "デブ", "ハゲ"],
  garuba: ["太客", "細客", "常連", "新規", "痛客", "お酒好き", "下戸", "金持ち", "ケチ", "既婚", "独身", "おじさん", "若者", "イケメン", "優しい"],
};

const INDUSTRY_FACT_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: [
    "🍾 シャンパン", "🍷 ボトル", "🥂 ドリンク", "🎉 お祝い",
    "✨ 本指名", "🥂 同伴", "🍰 アフター", "⏳ 延長", "🏃‍♂️ 駆け込み",
    "😂 爆笑", "🥺 相談", "💕 恋バナ", "🎤 カラオケ", "🎮 飲みゲー",
    "🎁 プレゼント", "📸 写真", "👗 ドレス", "🍽️ フード",
    "👔 お疲れ", "🥴 泥酔", "🙇‍♀️ 席外し", "💼 出張"
  ],
  fuzoku: [
    "✨ 本指名", "🏩 ロング", "🔞 濃厚", "🧴 メンエス", "💋 キス",
    "🛁 お風呂", "🧼 泡", "💆‍♂️ 癒やし", "🛌 延長", "🏃‍♂️ スキマ",
    "👗 コスプレ", "🤐 秘密", "🥺 甘え", "🍼 イチャ",
    "👔 仕事帰り", "🥴 快感", "🤫 絶頂", "🛌 爆睡"
  ],
  garuba: [
    "🍻 乾杯", "🍹 オリカク", "🥃 テキーラ", "🍾 シャンパン",
    "🎤 カラオケ", "🎯 ダーツ", "🍜 締め", "🏃‍♂️ 終電",
    "😂 爆笑", "🥴 泥酔", "📸 チェキ", "🍽️ 差し入れ",
    "⏳ 朝まで", "🥺 ガチ恋", "👕 私服", "🙇‍♀️ バタバタ"
  ]
};

const DIARY_FACT_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: [
    "👗 新ドレス", "🍾 お祝い感謝", "🎉 満員御礼", "🥺 暇アピ", "📸 盛れた",
    "🍰 差し入れ感謝", "💇‍♀️ ヘアメ完了", "💤 営業後・余韻"
  ],
  fuzoku: [
    "✨ 枠空き", "🏩 ロング歓迎", "🏃‍♂️ 突撃歓迎", "👗 新衣装・コス", "🛁 癒やし",
    "🤫 秘密の共有", "💄 準備完了", "💤 退勤・感謝"
  ],
  garuba: [
    "🍻 乾杯しよ", "🥃 テキーラ", "🎮 フルメン", "🍜 締めラー", "🥺 暇アピ",
    "📸 チェキ感謝", "👕 私服デー", "💤 朝まで・始発"
  ],
};

const MODE_LABELS: Record<BusinessType, { main: string; thanks: string }> = {
  fuzoku: { main: "写メ日記", thanks: "お礼日記" },
  cabaret: { main: "ブログ・SNS", thanks: "お礼LINE" },
  garuba: { main: "ブログ・SNS", thanks: "お礼LINE" },
};

const STYLE_MODAL_TEXTS = {
  cute: "🎀 可愛らしく、絵文字を多用した親しみやすい文体。",
  neat: "💎 上品で丁寧な言葉遣い。落ち着いた大人っぽい文体。",
  custom: "⚙️ 過去の文章を貼り付けると、AIがあなたの口調を学習します。",
};

const STYLE_PLACEHOLDERS: Record<BusinessType, string> = {
  cabaret: "（例）昨日はお店来てくれて本当にありがとう🥺✨\n久しぶりに〇〇くんの顔見れて、めちゃくちゃ楽しかったよ💗",
  fuzoku: "（例）今日は指名してくれてありがとう🧸💓\n〇〇さんと一緒にいる時間、すごく落ち着くし癒されちゃった🛁✨",
  garuba: "（例）今日はお店来てくれてありがとな🍾✨\n最近会えてなかったから、〇〇の顔見れて普通にテンション上がったわ😎",
};

const STYLE_DEFAULTS: Record<BusinessType, { tension: string; emoji: string }> = {
  cabaret: { tension: "4", emoji: "5" },
  fuzoku: { tension: "3", emoji: "4" },
  garuba: { tension: "3", emoji: "2" },
};

const APP_THEME_OPTIONS: { value: AppTheme; label: string; description: string }[] = [
  { value: "pink", label: "Pink", description: "やさしいピンク" },
  { value: "blue", label: "Blue", description: "淡くてかわいい青" },
];

const APP_FONT_OPTIONS: { value: AppFont; label: string; description: string }[] = [
  { value: "maru", label: "丸ゴシック", description: "やわらかい標準フォント" },
  { value: "standard", label: "標準ゴシック", description: "すっきり読みやすい" },
  { value: "mincho", label: "明朝体", description: "大人っぽくエモい" },
];

function parseMemoToJSON(memoStr?: string) {
  if (!memoStr) return [];
  try {
    const parsed = JSON.parse(memoStr);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return memoStr
      .split(/\n?---\n?/)
      .map((block) => {
        const match = block.trim().match(/^(\d{4}\/\d{2}\/\d{2}):\s*([\s\S]*)$/);
        if (match) return { date: match[1].replace(/\//g, "-"), text: match[2].trim(), tags: [] };
        return { date: "", text: block.trim(), tags: [] };
      })
      .filter((block) => block.text || block.date);
  }
}

function getCustomerStats(customer: Customer) {
  const allMemos = parseMemoToJSON(customer.memo);
  const visitMemos = allMemos.filter((memo) => !memo.type || memo.type === "visit" || memo.status === "legacy");
  const count = visitMemos.length === 0 ? 1 : visitMemos.length;
  const vipKeywords = ["太客", "エース", "一軍", "VIP", "金持ち", "良客", "常連", "一軍固定"];
  const isVip = customer.tagsArray.some((tag) => vipKeywords.includes(tag));
  return { count, isVip };
}

function getCustomerInitial(name: string) {
  return name.trim().slice(0, 1) || "?";
}

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createMemoBlock(entry?: Partial<CustomerEntry>, isExpanded = false): MemoBlock {
  return {
    id: `memo-block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    entryId: entry?.id || null,
    date: entry?.date || getTodayString(),
    text: entry?.text || "",
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    photoUrl: entry?.photoUrl || "",
    type: entry?.type || "visit",
    status: entry?.status || "legacy",
    isExpanded,
    isReadOnly: entry?.type === "sales",
    isDropdownOpen: false,
  };
}

function getStringHash(str: string) {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash &= hash;
  }
  return Math.abs(hash);
}

function getTargetDummyTag(businessType: BusinessType) {
  if (businessType === "fuzoku") return "風俗客";
  if (businessType === "garuba") return "ガルバ客";
  return "キャバ客";
}

function getDaysSinceLastVisit(memoStr?: string) {
  const allMemos = parseMemoToJSON(memoStr);
  const visitMemos = allMemos.filter((memo) => !memo.type || memo.type === "visit" || memo.status === "legacy");
  if (visitMemos.length === 0) return null;
  const lastMemo = visitMemos[visitMemos.length - 1];
  if (!lastMemo?.date) return null;
  const normalizedDate = String(lastMemo.date).replace(/\//g, "-");
  const date = new Date(`${normalizedDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = todayDate.getTime() - date.getTime();
  return diffTime < 0 ? 0 : Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function isAlertCustomer(customer: Customer) {
  const stats = getCustomerStats(customer);
  const days = getDaysSinceLastVisit(customer.memo);
  if (days === null) return false;
  if (stats.isVip) return days >= 14;
  if (stats.count <= 2) return days >= 7;
  return days >= 30;
}

const EMOTION_TAG_KEYWORDS = ["会いたい", "逢いたい", "逢い", "寂しい", "さみしい", "さびしい", "愛して", "好き", "秘密", "内緒", "おやすみ", "嬉しい", "うれしい", "夢心地", "待ってる", "独占", "枕", "病み", "メンヘラ"];

function isEmotionTag(tag: string) {
  return EMOTION_TAG_KEYWORDS.some((keyword) => tag.includes(keyword));
}

function getAvatarSvgMarkup(name: string, iconTheme: IconTheme) {
  const hash = getStringHash(name || "ゲスト");
  const hue = hash % 360;
  const liquidColor = `hsla(${hue}, 75%, 65%, 0.85)`;
  const strokeColor = "#C6A682";
  const themePaths: Record<IconTheme, string[]> = {
    glass: [
      `<path d="M10.5 7h3l-.6 8c0 .5-.4 1-.9 1s-.9-.5-.9-1z" fill="${liquidColor}"/><path d="M10 2h4l-1 13c0 1-1 2-1 2v4h3v1H9v-1h3v-4c0 0-1-1-1-2Z" stroke="${strokeColor}" stroke-width="1.2" stroke-linejoin="round"/>`,
      `<path d="M6.5 12h11l-.6 8h-9.8z" fill="${liquidColor}"/><path d="M6 4h12l-1 17H7z" stroke="${strokeColor}" stroke-width="1.2" stroke-linejoin="round"/>`,
      `<path d="M6 7h12L12 11.5z" fill="${liquidColor}"/><path d="M3 4h18L12 13v7h3v1H9v-1h3v-7z" stroke="${strokeColor}" stroke-width="1.2" stroke-linejoin="round"/>`
    ],
    jewel: [
      `<path d="M12 21L2 9h20L12 21z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/><path d="M2 9l5-6h10l5 6" stroke="${strokeColor}" stroke-width="1.2"/>`,
      `<path d="M12 22c5.5 0 10-4.5 10-10S12 2 12 2 2 6.5 2 12s4.5 10 10 10z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/>`,
      `<path d="M7 2h10l5 5v10l-5 5H7l-5-5V7l5-5z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/>`
    ],
    perfume: [
      `<path d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5v8H7v-8z" fill="${liquidColor}"/><path d="M10 2h4v5h-4zM7 12c0-2.8 2.2-5 5-5s5 2.2 5 5v8H7v-8z" stroke="${strokeColor}" stroke-width="1.2"/>`,
      `<path d="M6 10h12v11H6z" fill="${liquidColor}"/><path d="M10 3h4v4h-4zM6 10h12v11H6z" stroke="${strokeColor}" stroke-width="1.2"/>`
    ],
    moon_star: [
      `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/>`,
      `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/>`
    ],
    flower: [
      `<path d="M12 22V12M12 12c-4 0-6-4-6-8 4 0 6 4 6 8zm0 0c4 0 6-4 6-8-4 0-6 4-6 8z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/>`,
      `<path d="M12 22s-8-4.5-8-12c0-4 4-6 8-8 4 2 8 4 8 8 0 7.5-8 12-8 12z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/>`
    ],
    teacup: [
      `<path d="M4 8h12v6c0 3.3-2.7 6-6 6s-6-2.7-6-6V8z" fill="${liquidColor}"/><path d="M4 8h12v6c0 3.3-2.7 6-6 6s-6-2.7-6-6V8zM16 10h2c1.1 0 2 .9 2 2s-.9 2-2 2h-2M2 21h16" stroke="${strokeColor}" stroke-width="1.2"/>`
    ],
    symbol: [
      `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="${liquidColor}" stroke="${strokeColor}" stroke-width="1.2"/>`
    ]
  };
  const currentPaths = themePaths[iconTheme] || themePaths.glass;
  const selectedPath = currentPaths[hash % currentPaths.length];
  return `<div style="width: 100%; height: 100%; border-radius: 50%; background-color: #ffffff; border: 1px solid #f0e6e6; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" style="width: 55%; height: 55%;">${selectedPath}</svg></div>`;
}

function normalizeCustomer(customer: {
  id?: string | null;
  name?: string;
  memo?: string;
  tags?: string;
  entries?: CustomerEntry[];
  is_master_dummy?: boolean;
}): Customer {
  return {
    ...customer,
    id: customer.id || null,
    name: customer.name || "",
    memo: customer.memo || "",
    tags: customer.tags || "",
    entries: Array.isArray(customer.entries) ? customer.entries : [],
    tagsArray: customer.tags ? customer.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    isMasterDummy: customer.is_master_dummy === true,
  };
}

function readHiddenDummyIdsFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_DUMMY_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : []);
  } catch {
    return new Set();
  }
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");
  const [createMode, setCreateMode] = useState<CreateMode>("text");
  const [visitStatus, setVisitStatus] = useState<VisitStatus>("yes");
  const [styleTab, setStyleTab] = useState<StyleTab>("cute");
  const [dataView, setDataView] = useState<DataView>("customer");
  const [customerData, setCustomerData] = useState<Customer[]>([]);
  const [hiddenDummyIds, setHiddenDummyIds] = useState<Set<string>>(() =>
    typeof window !== "undefined" ? readHiddenDummyIdsFromStorage() : new Set(),
  );
  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [nameInputValue, setNameInputValue] = useState("");
  const [isCreateDetailsOpen, setIsCreateDetailsOpen] = useState(false);
  const [isTagAccordionOpen, setIsTagAccordionOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<null | "style" | "help" | "hidden" | "photo" | "edit" | "delete">(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState("");
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>("cabaret");
  const [iconTheme, setIconTheme] = useState<IconTheme>("glass");
  const [appTheme, setAppTheme] = useState<AppTheme>("pink");
  const [appFont, setAppFont] = useState<AppFont>("maru");
  const [currentListFilter, setCurrentListFilter] = useState<ListFilter>("all");
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([]);
  const [selectedFactTags, setSelectedFactTags] = useState<string[]>([]);
  const [styleTension, setStyleTension] = useState("3");
  const [styleEmoji, setStyleEmoji] = useState("4");
  const [customStyleText, setCustomStyleText] = useState("");
  const [editAttributeTags, setEditAttributeTags] = useState<string[]>([]);
  const [customAttrInput, setCustomAttrInput] = useState("");
  const [memoBlocks, setMemoBlocks] = useState<MemoBlock[]>([]);
  const [isCreateCustomerMode, setIsCreateCustomerMode] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [todayEpisodeText, setTodayEpisodeText] = useState("");
  const [inlineResultText, setInlineResultText] = useState("");
  const [currentEntryId, setCurrentEntryId] = useState("");
  const [isInlineResultVisible, setIsInlineResultVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionToastText, setActionToastText] = useState("完了しました");
  const [isActionToastVisible, setIsActionToastVisible] = useState(false);
  const [cuteToastIcon, setCuteToastIcon] = useState("🐰");
  const [cuteToastText, setCuteToastText] = useState("執筆中だよ...");
  const [isCuteToastVisible, setIsCuteToastVisible] = useState(false);
  const [isCuteToastIconAnimating, setIsCuteToastIconAnimating] = useState(false);
  const [currentFavoriteIds, setCurrentFavoriteIds] = useState<string[]>([]);
  const [currentFavoriteTexts, setCurrentFavoriteTexts] = useState<string[]>([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [historyEditTexts, setHistoryEditTexts] = useState<Record<string, string>>({});
  const [activeCustomerMenuId, setActiveCustomerMenuId] = useState<string | null>(null);
  const [hidingCustomerIds, setHidingCustomerIds] = useState<string[]>([]);
  const [vipBounceCustomerIds, setVipBounceCustomerIds] = useState<string[]>([]);
  const [isEditingHiddenCustomer, setIsEditingHiddenCustomer] = useState(false);
  const [deleteTargetCustomer, setDeleteTargetCustomer] = useState<Customer | null>(null);
  const actionToastTimerRef = useRef<number | null>(null);
  const cuteToastTimerRef = useRef<number | null>(null);
  const inlineResultRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const filterContainerRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRefs = useRef<Record<ListFilter, HTMLDivElement | null>>({
    alert: null,
    all: null,
    vip: null,
    new: null,
    second: null,
    regular: null,
  });

  /** お客様ノート：下スクロールで検索バーを隠す / 上で再表示（state は方向転換時のみ） */
  const [isCustomerSearchBarVisible, setIsCustomerSearchBarVisible] = useState(true);
  const mainScrollAreaRef = useRef<HTMLElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const customerSearchBarVisibleRef = useRef(true);
  const customerSearchInputFocusedRef = useRef(false);
  const dataTabScrollRafRef = useRef<number | null>(null);
  const activeTabRef = useRef<ActiveTab>(activeTab);
  const dataViewRef = useRef<DataView>(dataView);
  activeTabRef.current = activeTab;
  dataViewRef.current = dataView;

  useEffect(() => {
    customerSearchBarVisibleRef.current = isCustomerSearchBarVisible;
  }, [isCustomerSearchBarVisible]);

  useEffect(() => {
    if (activeTab !== "data" || dataView !== "customer") {
      setIsCustomerSearchBarVisible(true);
      customerSearchBarVisibleRef.current = true;
    } else {
      const root = mainScrollAreaRef.current;
      if (root) lastScrollTopRef.current = root.scrollTop;
    }
  }, [activeTab, dataView]);

  useEffect(() => {
    const root = mainScrollAreaRef.current;
    if (!root) return;

    const flushScroll = () => {
      dataTabScrollRafRef.current = null;
      if (activeTabRef.current !== "data" || dataViewRef.current !== "customer") {
        lastScrollTopRef.current = root.scrollTop;
        return;
      }

      if (customerSearchInputFocusedRef.current) {
        if (!customerSearchBarVisibleRef.current) {
          customerSearchBarVisibleRef.current = true;
          setIsCustomerSearchBarVisible(true);
        }
        lastScrollTopRef.current = root.scrollTop;
        return;
      }

      const st = root.scrollTop;
      const prev = lastScrollTopRef.current;
      const clientH = root.clientHeight;
      const scrollH = root.scrollHeight;

      // 上端 or 上ラバーバンド（scrollTop ≦ 0）: 検索バーは常に表示し、以降の方向判定をしない
      if (st <= 0) {
        if (!customerSearchBarVisibleRef.current) {
          customerSearchBarVisibleRef.current = true;
          setIsCustomerSearchBarVisible(true);
        }
        lastScrollTopRef.current = st;
        return;
      }

      // 下端 or 下ラバーバンド: 可視性の setState だけ飛ばす（揺れによるジッターを防ぐ）
      if (st + clientH >= scrollH) {
        lastScrollTopRef.current = st;
        return;
      }

      if (st < 6) {
        if (!customerSearchBarVisibleRef.current) {
          customerSearchBarVisibleRef.current = true;
          setIsCustomerSearchBarVisible(true);
        }
        lastScrollTopRef.current = st;
        return;
      }

      if (st > prev) {
        if (st > 12 && customerSearchBarVisibleRef.current) {
          customerSearchBarVisibleRef.current = false;
          setIsCustomerSearchBarVisible(false);
        }
      } else if (st < prev) {
        if (!customerSearchBarVisibleRef.current) {
          customerSearchBarVisibleRef.current = true;
          setIsCustomerSearchBarVisible(true);
        }
      }

      lastScrollTopRef.current = st;
    };

    const onScroll = () => {
      if (dataTabScrollRafRef.current != null) return;
      dataTabScrollRafRef.current = window.requestAnimationFrame(flushScroll);
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (dataTabScrollRafRef.current != null) {
        window.cancelAnimationFrame(dataTabScrollRafRef.current);
        dataTabScrollRafRef.current = null;
      }
    };
  }, []);

  const flushLoadingOnAuthError = useCallback(() => setIsCustomersLoading(false), []);

  const fetchCustomers = useCallback(async (targetUserId: string, options: { showLoading?: boolean } = {}) => {
    const showLoading = options.showLoading !== false;
    if (showLoading) setIsCustomersLoading(true);
    try {
      const res = await fetch("/api/customers/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      const data = await res.json();
      const customers = data.success && Array.isArray(data.customers)
        ? data.customers.map(normalizeCustomer)
        : [];
      setCustomerData(customers);
      setCurrentFavoriteIds(Array.isArray(data.favoriteIds) ? data.favoriteIds.map((id: unknown) => String(id)).filter(Boolean) : []);
      setCurrentFavoriteTexts(Array.isArray(data.favoriteTexts) ? data.favoriteTexts.map((text: unknown) => String(text)).filter(Boolean) : []);
    } catch (error) {
      console.error("fetchCustomers Error:", error);
      if (showLoading) {
        setCustomerData([]);
        setCurrentFavoriteIds([]);
        setCurrentFavoriteTexts([]);
      }
    } finally {
      if (showLoading) setIsCustomersLoading(false);
    }
  }, []);

  const { userId, liffAuthStatus, sessionReady } = useLiffAuth(fetchCustomers, flushLoadingOnAuthError);

  /** 認証未完了または顧客データ取得中 — コンテンツ領域のみスケルトン（レイアウトシェルは常時表示） */
  const showCustomersDataSkeleton = !sessionReady || isCustomersLoading;

  const persistHiddenDummyIds = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(HIDDEN_DUMMY_IDS_KEY, JSON.stringify([...next]));
    } catch {
      /* noop */
    }
    setHiddenDummyIds(new Set(next));
  }, []);

  useEffect(() => {
    const savedBusinessType = localStorage.getItem("businessType");
    const savedIconTheme = localStorage.getItem("iconTheme") as IconTheme | null;
    if (savedBusinessType === "host") {
      setSelectedBusinessType("garuba");
      localStorage.setItem("businessType", "garuba");
    } else if (savedBusinessType && ["cabaret", "fuzoku", "garuba"].includes(savedBusinessType)) {
      setSelectedBusinessType(savedBusinessType as BusinessType);
    }
    if (savedIconTheme && ["glass", "jewel", "perfume", "moon_star", "flower", "teacup", "symbol"].includes(savedIconTheme)) {
      setIconTheme(savedIconTheme);
    }
    const savedAppTheme = localStorage.getItem("appTheme");
    if (savedAppTheme && ["pink", "blue"].includes(savedAppTheme)) {
      setAppTheme(savedAppTheme as AppTheme);
    } else if (savedAppTheme && ["sweet", "noir", "chic"].includes(savedAppTheme)) {
      localStorage.setItem("appTheme", "pink");
      setAppTheme("pink");
    }
    const savedAppFont = localStorage.getItem("appFont") as AppFont | null;
    if (savedAppFont && ["standard", "maru", "mincho"].includes(savedAppFont)) {
      setAppFont(savedAppFont);
    } else {
      localStorage.setItem("appFont", "maru");
    }
    const savedStyle = localStorage.getItem("selectedStyle") as StyleTab | null;
    if (savedStyle && ["cute", "custom", "neat"].includes(savedStyle)) {
      setStyleTab(savedStyle);
    }
    setCustomStyleText(localStorage.getItem("customStyleText") || "");
    setIsCompactMode(localStorage.getItem("isCompactMode") === "true");
  }, []);
  useEffect(() => {
    document.body.dataset.appTheme = appTheme;
    document.body.dataset.appFont = appFont;
  }, [appTheme, appFont]);

  useEffect(() => {
    const defaults = STYLE_DEFAULTS[selectedBusinessType] || STYLE_DEFAULTS.cabaret;
    setStyleTension(localStorage.getItem("tensionSlider") || defaults.tension);
    setStyleEmoji(localStorage.getItem("emojiSlider") || defaults.emoji);
  }, [selectedBusinessType]);

  useEffect(() => {
    return () => {
      if (actionToastTimerRef.current) window.clearTimeout(actionToastTimerRef.current);
      if (cuteToastTimerRef.current) window.clearTimeout(cuteToastTimerRef.current);
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "data" || dataView !== "customer") return;
    window.setTimeout(() => {
      filterButtonRefs.current[currentListFilter]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 80);
  }, [activeTab, dataView, currentListFilter]);

  const targetDummyTag = getTargetDummyTag(selectedBusinessType);
  const baseVisibleCustomers = customerData.filter((customer) => {
    if (customer.tagsArray.includes("非表示")) return false;
    if (customer.isMasterDummy && customer.id && hiddenDummyIds.has(customer.id)) return false;
    // マスターお試し: 現在の業態に対応するタグ（キャバ客／ガルバ客／風俗客など）のみ
    if (customer.isMasterDummy && !customer.tagsArray.includes(targetDummyTag)) return false;
    if (
      !customer.isMasterDummy
      && customer.tagsArray.includes("ダミー")
      && !customer.tagsArray.includes(targetDummyTag)
    ) {
      return false;
    }
    return true;
  });
  const quickAccessCustomers = baseVisibleCustomers
    .sort((a, b) => {
      const statsA = getCustomerStats(a);
      const statsB = getCustomerStats(b);
      if (statsA.isVip && !statsB.isVip) return -1;
      if (!statsA.isVip && statsB.isVip) return 1;
      return statsB.count - statsA.count;
    })
    .slice(0, 15);

  const filteredCustomers = baseVisibleCustomers
    .filter((customer) => {
      const normalizedSearchText = customerSearchText.trim().toLowerCase();
      if (normalizedSearchText) {
        const memos = parseMemoToJSON(customer.memo).filter((memo) => memo.type !== "sales");
        const matchName = customer.name.toLowerCase().includes(normalizedSearchText);
        const matchMemo = memos.some((memo) => String(memo.text || "").toLowerCase().includes(normalizedSearchText) || (memo.tags || []).some((tag: string) => tag.toLowerCase().includes(normalizedSearchText)));
        const matchTags = customer.tagsArray.some((tag) => tag.toLowerCase().includes(normalizedSearchText));
        return matchName || matchMemo || matchTags;
      }

      const stats = getCustomerStats(customer);
      if (currentListFilter === "alert") return isAlertCustomer(customer);
      if (currentListFilter === "vip") return stats.isVip;
      if (currentListFilter === "new") return stats.count === 1;
      if (currentListFilter === "second") return stats.count === 2;
      if (currentListFilter === "regular") return stats.count >= 3;
      return true;
    })
    .sort((a, b) => {
      const statsA = getCustomerStats(a);
      const statsB = getCustomerStats(b);
      if (currentListFilter === "alert") {
        if (statsA.isVip && !statsB.isVip) return -1;
        if (!statsA.isVip && statsB.isVip) return 1;
        return (getDaysSinceLastVisit(b.memo) || 0) - (getDaysSinceLastVisit(a.memo) || 0);
      }
      if (statsA.isVip && !statsB.isVip) return -1;
      if (!statsA.isVip && statsB.isVip) return 1;
      return statsB.count - statsA.count;
    });
  const alertCount = baseVisibleCustomers.filter(isAlertCustomer).length;
  const hiddenCustomers = customerData.filter((customer) => customer.tagsArray.includes("非表示"));
  const selectedCustomer = selectedCustomerId
    ? customerData.find((customer) => customer.id === selectedCustomerId) || null
    : null;
  const isEditingDummyCustomer =
    !isCreateCustomerMode &&
    selectedCustomer != null &&
    (selectedCustomer.isMasterDummy === true || selectedCustomer.tagsArray.includes("ダミー"));
  const messageMode = createMode === "photo" ? "diary" : "line";
  const modeLabels = MODE_LABELS[selectedBusinessType] || MODE_LABELS.cabaret;
  const stylePlaceholder = STYLE_PLACEHOLDERS[selectedBusinessType] || STYLE_PLACEHOLDERS.cabaret;
  const moodTags = INDUSTRY_MOOD_CONFIGS[selectedBusinessType] || INDUSTRY_MOOD_CONFIGS.cabaret;
  const lineFactTags = INDUSTRY_FACT_CONFIGS[selectedBusinessType] || INDUSTRY_FACT_CONFIGS.cabaret;
  const diaryFactTags = DIARY_FACT_CONFIGS[selectedBusinessType] || DIARY_FACT_CONFIGS.cabaret;
  const factTags = messageMode === "diary" ? diaryFactTags : lineFactTags;
  const editAttributeOptions = Array.from(new Set([
    ...(INDUSTRY_ATTRIBUTE_TAGS[selectedBusinessType] || INDUSTRY_ATTRIBUTE_TAGS.cabaret),
    ...(selectedCustomer?.tagsArray || []),
    ...editAttributeTags,
  ])).filter((tag) => tag !== "ダミー" && tag !== "非表示" && tag !== "一軍固定");
  const historyItems = customerData
    .flatMap((customer) => (Array.isArray(customer.entries) ? customer.entries : []).map((entry) => {
      const generatedText = entry.finalSentText || entry.final_sent_text || entry.aiGeneratedText || entry.ai_generated_text || "";
      return {
        ...entry,
        customerId: customer.id,
        customerName: customer.name,
        customerTags: customer.tagsArray || [],
        displayText: generatedText,
        displayDate: entry.date || entry.entry_date || "",
        inputText: entry.inputMemo || entry.input_memo || entry.text || "",
      };
    }))
    .filter((entry) => entry.displayText)
    .sort((a, b) => {
      const aFav = currentFavoriteIds.includes(String(a.id || "")) ? 1 : 0;
      const bFav = currentFavoriteIds.includes(String(b.id || "")) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return new Date(b.displayDate || 0).getTime() - new Date(a.displayDate || 0).getTime();
    });

  function closeModal() {
    if (activeModal === "edit") {
      closeEditModal();
      return;
    }
    if (activeModal === "delete") {
      setActiveModal("edit");
      return;
    }
    setActiveModal(null);
    setExpandedPhotoUrl("");
  }

  function closeEditModal() {
    setActiveModal(isEditingHiddenCustomer ? "hidden" : null);
    setIsEditingHiddenCustomer(false);
    setDeleteTargetCustomer(null);
  }

  function showNotice(message: string) {
    window.alert(message);
  }

  function showActionToast(message: string) {
    if (actionToastTimerRef.current) window.clearTimeout(actionToastTimerRef.current);
    setActionToastText(message);
    setIsActionToastVisible(true);
    actionToastTimerRef.current = window.setTimeout(() => {
      setIsActionToastVisible(false);
    }, 2500);
  }

  function showCuteToast(isComplete: boolean) {
    if (cuteToastTimerRef.current) window.clearTimeout(cuteToastTimerRef.current);

    if (!isComplete) {
      setCuteToastIcon("🐰");
      setCuteToastText("執筆中だよ...");
      setIsCuteToastIconAnimating(true);
      setIsCuteToastVisible(true);
      return;
    }

    setCuteToastIcon("✨");
    setCuteToastText("できたよ！");
    setIsCuteToastIconAnimating(false);
    setIsCuteToastVisible(true);
    cuteToastTimerRef.current = window.setTimeout(() => {
      setIsCuteToastVisible(false);
    }, 3000);
  }

  function showCuteErrorToast() {
    if (cuteToastTimerRef.current) window.clearTimeout(cuteToastTimerRef.current);
    setCuteToastIcon("💦");
    setCuteToastText("❌ エラー発生");
    setIsCuteToastIconAnimating(false);
    setIsCuteToastVisible(true);
    cuteToastTimerRef.current = window.setTimeout(() => {
      setIsCuteToastVisible(false);
    }, 3000);
  }

  function selectCustomer(customer: Customer) {
    const isSameCustomer = selectedCustomerId === customer.id && nameInputValue === customer.name;

    if (isSameCustomer) {
      setSelectedCustomerId(null);
      setNameInputValue("");
      return;
    }

    setSelectedCustomerId(customer.id);
    setNameInputValue(customer.name);
    setCreateMode("text");
    setActiveTab("create");
  }

  function clearCustomerLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openCustomerMenu(customer: Customer) {
    if (!customer.id) return;
    setActiveCustomerMenuId(customer.id);
    navigator.vibrate?.(18);
  }

  function startCustomerLongPress(customer: Customer, event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    clearCustomerLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      openCustomerMenu(customer);
    }, 420);
  }

  function updateCustomerTagsOptimistically(customerId: string, nextTags: string[]) {
    setCustomerData((current) => current.map((customer) => (
      customer.id === customerId
        ? { ...customer, tags: nextTags.join(", "), tagsArray: nextTags }
        : customer
    )));
  }

  async function persistCustomerTags(customer: Customer, nextTags: string[], previousTags: string[]) {
    if (!customer.id) return;
    if (!sessionReady || userId === null) {
      showActionToast("認証の完了を待ってから試してください");
      return;
    }
    try {
      const res = await fetch("/api/customers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, customerId: customer.id, newName: customer.name, newTags: nextTags }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "更新に失敗しました");
    } catch (error) {
      console.error("persistCustomerTags Error:", error);
      updateCustomerTagsOptimistically(customer.id, previousTags);
      setHidingCustomerIds((current) => current.filter((id) => id !== customer.id));
      showActionToast("通信エラーのため元に戻しました");
    }
  }

  function toggleCustomerVip(customer: Customer) {
    if (!customer.id) return;
    if (customer.isMasterDummy) return;
    const customerId = customer.id;
    const previousTags = customer.tagsArray;
    const isFixedVip = previousTags.includes("一軍固定");
    const nextTags = isFixedVip ? previousTags.filter((tag) => tag !== "一軍固定") : [...previousTags, "一軍固定"];
    setActiveCustomerMenuId(null);
    updateCustomerTagsOptimistically(customerId, nextTags);
    if (!isFixedVip) {
      setVipBounceCustomerIds((current) => [...current.filter((id) => id !== customerId), customerId]);
      window.setTimeout(() => setVipBounceCustomerIds((current) => current.filter((id) => id !== customerId)), 720);
    }
    void persistCustomerTags(customer, nextTags, previousTags);
  }

  function persistHiddenDummyForCustomer(customerId: string) {
    const next = new Set(hiddenDummyIds);
    next.add(customerId);
    persistHiddenDummyIds(next);
  }

  function hideCustomerOptimistically(customer: Customer) {
    if (!customer.id) return;
    if (customer.isMasterDummy) {
      setActiveCustomerMenuId(null);
      persistHiddenDummyForCustomer(customer.id);
      showActionToast("サンプル顧客を非表示にしました");
      return;
    }
    const customerId = customer.id;
    const previousTags = customer.tagsArray;
    const nextTags = previousTags.includes("非表示") ? previousTags : [...previousTags, "非表示"];
    setActiveCustomerMenuId(null);
    setHidingCustomerIds((current) => [...current.filter((id) => id !== customerId), customerId]);
    window.setTimeout(() => {
      updateCustomerTagsOptimistically(customerId, nextTags);
      void persistCustomerTags(customer, nextTags, previousTags);
    }, 220);
  }

  function restoreHiddenCustomer(customer: Customer) {
    if (!customer.id) return;
    const previousTags = customer.tagsArray;
    const nextTags = previousTags.filter((tag) => tag !== "非表示");
    updateCustomerTagsOptimistically(customer.id, nextTags);
    showActionToast("🟢 非表示を解除しました");
    void persistCustomerTags(customer, nextTags, previousTags);
  }

  function openHiddenDeleteConfirm() {
    if (!selectedCustomer || selectedCustomer.isMasterDummy) return;
    setDeleteTargetCustomer(selectedCustomer);
    setActiveModal("delete");
  }

  async function executeDeleteCustomer() {
    const target = deleteTargetCustomer;
    if (!target?.id) return;
    if (!sessionReady || userId === null) {
      showActionToast("認証の完了を待ってから試してください");
      return;
    }
    const previousCustomers = customerData;
    setCustomerData((current) => current.filter((customer) => customer.id !== target.id));
    setActiveModal("hidden");
    setIsEditingHiddenCustomer(false);
    setDeleteTargetCustomer(null);
    showActionToast("🗑️ 完全に削除しました");

    try {
      const res = await fetch("/api/customers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, customerId: target.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "削除に失敗しました");
    } catch (error) {
      console.error("executeDeleteCustomer Error:", error);
      setCustomerData(previousCustomers);
      showActionToast("通信エラーのため元に戻しました");
    }
  }

  function getPastMemos(customer: Customer | null) {
    if (!customer) return [];
    return parseMemoToJSON(customer.memo).filter((memo) => memo.type !== "sales");
  }

  function toggleStringValue(value: string, setter: Dispatch<SetStateAction<string[]>>) {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleFactTag(tag: string) {
    toggleStringValue(tag, setSelectedFactTags);
  }

  function openEditCustomer(customer: Customer, fromHiddenList = false) {
    const memos = getPastMemos(customer);
    setIsCreateCustomerMode(false);
    setIsEditingHiddenCustomer(fromHiddenList);
    setDeleteTargetCustomer(null);
    setSelectedCustomerId(customer.id);
    setNameInputValue(customer.name);
    setEditCustomerName(customer.name);
    setEditAttributeTags(customer.tagsArray.filter((tag) => tag !== "非表示" && tag !== "一軍固定" && tag !== "ダミー"));
    setMemoBlocks(memos.length > 0 ? memos.map((memo) => createMemoBlock(memo, false)) : [createMemoBlock({}, true)]);
    setIsTagAccordionOpen(false);
    setActiveModal("edit");
  }

  function openCreateCustomerModal() {
    setIsCreateCustomerMode(true);
    setIsEditingHiddenCustomer(false);
    setDeleteTargetCustomer(null);
    setSelectedCustomerId(null);
    setNameInputValue("");
    setEditCustomerName("");
    setEditAttributeTags([]);
    setCustomAttrInput("");
    setMemoBlocks([createMemoBlock({}, true)]);
    setIsTagAccordionOpen(false);
    setActiveModal("edit");
  }

  function setListFilter(filterType: ListFilter) {
    const nextFilter = currentListFilter === filterType && filterType !== "all" ? "all" : filterType;
    setCurrentListFilter(nextFilter);
    window.requestAnimationFrame(() => {
      filterButtonRefs.current[nextFilter]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  }

  function setBusinessType(value: BusinessType) {
    setSelectedBusinessType(value);
    localStorage.setItem("businessType", value);
  }

  function setSelectedStyle(value: StyleTab) {
    setStyleTab(value);
    localStorage.setItem("selectedStyle", value);
  }

  function setSelectedIconTheme(value: IconTheme) {
    setIconTheme(value);
    localStorage.setItem("iconTheme", value);
  }

  function setSelectedAppTheme(value: AppTheme) {
    setAppTheme(value);
    localStorage.setItem("appTheme", value);
  }

  function setSelectedAppFont(value: AppFont) {
    setAppFont(value);
    localStorage.setItem("appFont", value);
  }

  function toggleCompactMode() {
    setIsCompactMode((current) => {
      localStorage.setItem("isCompactMode", String(!current));
      return !current;
    });
  }

  function resetHiddenDummyCustomers() {
    persistHiddenDummyIds(new Set());
    showActionToast("サンプル顧客の非表示をリセットしました");
  }

  function addCustomAttributeTag() {
    const newTag = customAttrInput.trim();
    if (!newTag) return;
    setEditAttributeTags((current) => current.includes(newTag) ? current : [...current, newTag]);
    setCustomAttrInput("");
  }

  function updateMemoBlock(id: string, patch: Partial<MemoBlock>) {
    setMemoBlocks((current) => current.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function addNewMemoBlock() {
    setMemoBlocks((current) => [...current, createMemoBlock({}, true)]);
  }

  function deleteMemoBlock(id: string) {
    setMemoBlocks((current) => current.filter((block) => block.id !== id));
  }

  function toggleMemoTag(blockId: string, tag: string) {
    setMemoBlocks((current) => current.map((block) => {
      if (block.id !== blockId) return block;
      const isSelected = block.tags.includes(tag);
      return { ...block, tags: isSelected ? block.tags.filter((currentTag) => currentTag !== tag) : [...block.tags, tag] };
    }));
  }

  function removeMemoTag(blockId: string, tag: string) {
    setMemoBlocks((current) => current.map((block) => (
      block.id === blockId ? { ...block, tags: block.tags.filter((currentTag) => currentTag !== tag) } : block
    )));
  }

  function saveMoodPreset() {
    if (selectedMoodTags.length === 0) {
      showActionToast("保存するムードタグがありません");
      return;
    }
    localStorage.setItem("savedMoodTagsPreset", JSON.stringify(selectedMoodTags));
    showActionToast("プリセットを保存しました");
  }

  function loadMoodPreset() {
    const saved = JSON.parse(localStorage.getItem("savedMoodTagsPreset") || "[]");
    if (!Array.isArray(saved) || saved.length === 0) {
      showActionToast("保存されたプリセットがありません");
      return;
    }
    setSelectedMoodTags(saved.map((tag) => String(tag)).filter(Boolean));
    showActionToast("プリセットを読み込みました");
  }

  function sendCompletionStatus(status: string) {
    if (!currentEntryId || !inlineResultText) return;
    if (!sessionReady || userId === null) return;
    fetch("/api/entries/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, entryId: currentEntryId, finalSentText: inlineResultText, deliveryStatus: status }),
    }).catch((error) => console.error("sendCompletionStatus Error:", error));
  }

  function copyInlineResult() {
    navigator.clipboard.writeText(inlineResultText).then(() => {
      showActionToast("📋 コピーしました！");
      sendCompletionStatus("copied");
    }).catch((error) => {
      showActionToast(`コピーに失敗しました: ${error}`);
    });
  }

  function sendInlineToLine() {
    sendCompletionStatus("line_sent");
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(inlineResultText)}`;
    window.open(url, "_blank");
    showActionToast("💬 LINEに送信しました！");
  }

  function toggleHistoryText(entryId: string) {
    if (!entryId || editingHistoryId === entryId) return;
    setExpandedHistoryIds((current) => (
      current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]
    ));
  }

  async function toggleFavoriteHistory(item: (typeof historyItems)[number]) {
    const targetId = String(item.id || "");
    if (!targetId) return;
    if (!sessionReady || userId === null) {
      showActionToast("認証の完了を待ってから試してください");
      return;
    }

    const isCurrentlyFavorited = currentFavoriteIds.includes(targetId);
    const targetText = String(item.displayText || "").trim();
    const previousFavoriteIds = currentFavoriteIds;
    const previousFavoriteTexts = currentFavoriteTexts;

    if (isCurrentlyFavorited) {
      setCurrentFavoriteIds((current) => current.filter((id) => id !== targetId));
      setCurrentFavoriteTexts((current) => current.filter((text) => text !== targetText));
    } else {
      if (currentFavoriteIds.length >= 5) {
        showActionToast("お気に入りは最大5件までです。どれかを外してください。");
        return;
      }
      setCurrentFavoriteIds((current) => [targetId, ...current.filter((id) => id !== targetId)]);
      if (targetText) setCurrentFavoriteTexts((current) => [targetText, ...current.filter((text) => text !== targetText)]);
    }

    showActionToast(isCurrentlyFavorited ? "お気に入りを解除しました" : "💖 お気に入り登録しました！\nAIがこの文章を学習します！");

    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          entryId: targetId,
          customerId: item.customerId || null,
          customerName: item.customerName,
        }),
      });
      const data = await res.json();
      if (!data.success || data.limitReached) {
        setCurrentFavoriteIds(previousFavoriteIds);
        setCurrentFavoriteTexts(previousFavoriteTexts);
        showActionToast(data.limitReached ? "お気に入りは最大5件までです。" : "通信エラーが発生しました。元に戻します。");
      }
    } catch (error) {
      console.error("Toggle Error:", error);
      setCurrentFavoriteIds(previousFavoriteIds);
      setCurrentFavoriteTexts(previousFavoriteTexts);
      showActionToast("通信エラーが発生しました。元に戻します。");
    }
  }

  function enableEditHistory(item: (typeof historyItems)[number]) {
    const targetId = String(item.id || "");
    if (!targetId) return;
    setHistoryEditTexts((current) => ({ ...current, [targetId]: item.displayText || "" }));
    setEditingHistoryId(targetId);
    setExpandedHistoryIds((current) => current.includes(targetId) ? current : [...current, targetId]);
    window.setTimeout(() => {
      const editEl = document.getElementById(`history-edit-${targetId}`) as HTMLTextAreaElement | null;
      editEl?.focus();
      editEl?.setSelectionRange(editEl.value.length, editEl.value.length);
    }, 0);
  }

  function cancelEditHistory(entryId: string) {
    setEditingHistoryId((current) => current === entryId ? null : current);
  }

  async function saveAndCopyHistory(item: (typeof historyItems)[number]) {
    const targetId = String(item.id || "");
    if (!targetId) return;
    if (!sessionReady || userId === null) {
      showActionToast("認証の完了を待ってから試してください");
      return;
    }

    const newText = (historyEditTexts[targetId] || "").trim();
    if (!newText) {
      showActionToast("本文が空のため保存できません");
      return;
    }

    setCustomerData((current) => current.map((customer) => ({
      ...customer,
      entries: customer.entries.map((entry) => (
        String(entry.id || "") === targetId
          ? { ...entry, finalSentText: newText, final_sent_text: newText }
          : entry
      )),
    })));

    setCurrentFavoriteTexts((current) => (
      currentFavoriteIds.includes(targetId)
        ? [newText, ...current.filter((text) => text !== item.displayText && text !== newText)].slice(0, 5)
        : current
    ));

    try {
      await navigator.clipboard.writeText(newText);
      showActionToast("📋 コピー＆上書き保存しました");
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      showActionToast("保存しました（コピーに失敗しました）");
    }

    fetch("/api/entries/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        entryId: targetId,
        finalSentText: newText,
        deliveryStatus: "copied",
      }),
    }).catch((error) => console.error("History save API Error:", error));

    cancelEditHistory(targetId);
  }

  async function generateDiary() {
    if (isCreateDetailsOpen) setIsCreateDetailsOpen(false);

    if (!sessionReady || userId === null) {
      showNotice("ユーザー認証の完了をお待ちください");
      return;
    }

    const name = nameInputValue.trim();
    const isPhoto = createMode === "photo";
    const targetCustomer = selectedCustomer || customerData.find((customer) => customer.name === name) || null;

    if (!isPhoto && !name && !window.confirm("名前が入力されていませんが、そのまま作成しますか？")) {
      return;
    }

    setIsInlineResultVisible(false);
    setInlineResultText("");
    setCurrentEntryId("");
    setIsGenerating(true);
    showCuteToast(false);

    try {
      let customerRank = "新規";
      let visitCount = 1;
      if (targetCustomer) {
        const stats = getCustomerStats(targetCustomer);
        visitCount = stats.count;
        if (stats.isVip) customerRank = "VIP";
        else if (stats.count === 1) customerRank = "新規";
        else if (stats.count === 2) customerRank = "2回目";
        else customerRank = "常連";
      }

      const forbiddenTags = ["新規", "初回", "初回来店", "初めて", "一見", "常連", "リピーター", "2回目", "二回目", "3回目", "三回目", "1回目", "一回目"];
      const cleanedCustomerTags = (targetCustomer?.tagsArray || []).filter((tag) => !forbiddenTags.some((forbidden) => tag.includes(forbidden)));
      const memos = parseMemoToJSON(targetCustomer ? targetCustomer.memo : "").filter((memo) => memo.type !== "sales");
      const filteredMemosStr = memos.map((memo) => {
        const filteredTags = (memo.tags || []).filter((tag: string) => !isEmotionTag(tag));
        const tagsStr = filteredTags.length > 0 ? `(タグ: ${filteredTags.join(", ")})` : "";
        return `${memo.date}: ${memo.text} ${tagsStr}`.trim();
      }).join("\n---\n");
      const isAlertStatus = targetCustomer ? isAlertCustomer(targetCustomer) : false;
      const now = new Date();
      const dayOfWeek = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"][now.getDay()];
      const currentMonth = `${now.getMonth() + 1}月`;

      const payload = {
        userId,
        customerId: targetCustomer?.id || selectedCustomerId,
        customerName: targetCustomer ? targetCustomer.name : name,
        businessType: selectedBusinessType,
        customerRank,
        visitCount: String(visitCount),
        visitStatus: visitStatus === "yes" ? "visit" : "sales",
        isAlert: String(isAlertStatus),
        dayOfWeek,
        currentMonth,
        episodeText: todayEpisodeText,
        pastMemo: filteredMemosStr,
        customerTags: cleanedCustomerTags.join(","),
        factTags: selectedFactTags.filter((tag) => factTags.includes(tag)).join(","),
        moodTags: selectedMoodTags.join(","),
        style: styleTab,
        tension: styleTension,
        emoji: styleEmoji,
        customText: customStyleText,
        favoriteTexts: currentFavoriteTexts.slice(0, 5).join("\n"),
        messageMode,
        imageFile: null,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "不明なエラー");
      }

      showCuteToast(true);
      if (!isPhoto && name) {
        await fetchCustomers(userId, { showLoading: false });
      }

      setInlineResultText(data.generatedText || "（テキストがありません）");
      setIsInlineResultVisible(true);
      setSelectedFactTags([]);
      setCurrentEntryId(data.entry_id || "");

      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            inlineResultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          });
        });
      }, 650);
    } catch (error) {
      console.error("generateDiary Error:", error);
      showCuteErrorToast();
      showNotice(`エラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsGenerating(false);
    }
  }

  function saveCustomerEdit() {
    const newName = editCustomerName.trim();
    if (!newName) {
      showNotice("名前を入力してください");
      return;
    }

    if (!sessionReady || userId === null) {
      showNotice("ユーザー認証の完了をお待ちください");
      return;
    }

    const customerBeingEdited =
      !isCreateCustomerMode && selectedCustomerId
        ? customerData.find((c) => c.id === selectedCustomerId) ?? null
        : null;
    if (
      customerBeingEdited &&
      (customerBeingEdited.isMasterDummy === true || customerBeingEdited.tagsArray.includes("ダミー"))
    ) {
      return;
    }

    const newTags = editAttributeTags.slice();
    const entriesPayload = memoBlocks.map((block) => ({
      id: block.entryId || null,
      date: block.date,
      text: block.text,
      tags: block.tags,
      photoUrl: block.photoUrl || null,
      type: block.type,
    }));
    const creating = isCreateCustomerMode;
    const initialCustomerId = selectedCustomerId;

    closeEditModal();
    setActiveTab("data");
    setDataView("customer");
    showActionToast("保存したよ！");

    void (async () => {
      try {
        let customerId: string | null = initialCustomerId;
        if (creating) {
          const res = await fetch("/api/customers/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, newName, newTags }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "顧客作成に失敗しました");
          customerId = data.customer?.id || null;
        } else {
          const res = await fetch("/api/customers/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, customerId: initialCustomerId, newName, newTags }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "顧客更新に失敗しました");
        }

        if (customerId) {
          const upsertRes = await fetch("/api/entries/upsert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              customerId,
              entries: entriesPayload,
              deletedEntryIds: [],
            }),
          });
          const upsertData = (await upsertRes.json().catch(() => ({}))) as { success?: boolean; error?: string };
          if (!upsertRes.ok || upsertData.success === false) {
            throw new Error(upsertData.error || "エントリの保存に失敗しました");
          }
        }

        await fetchCustomers(userId);
      } catch (error) {
        console.error("saveCustomerEdit Error:", error);
        showActionToast("通信エラーのため元に戻しました");
        await fetchCustomers(userId);
      }
    })();
  }

  return (
    <>
<div id="actionToast" data-current-user-id={userId ?? ""} style={{top: isActionToastVisible ? "0" : "-150px", whiteSpace: "pre-line"}}>{actionToastText}</div>

  <div id="cuteToast" style={{right: isCuteToastVisible ? "0px" : "-250px"}}>
    <span id="cuteToastIcon" style={{fontSize: "16px", display: "inline-block", animation: isCuteToastIconAnimating ? "bounce-icon 1s infinite" : "none"}}>{cuteToastIcon}</span>
    <span id="cuteToastText">{cuteToastText}</span>
  </div>

      <input type="radio" name="nav" id="nav-create" className="ui-state" checked={activeTab === "create"} onChange={() => setActiveTab("create")} />
      <input type="radio" name="nav" id="nav-data" className="ui-state" checked={activeTab === "data"} onChange={() => setActiveTab("data")} />
      <input type="radio" name="nav" id="nav-settings" className="ui-state" checked={activeTab === "settings"} onChange={() => setActiveTab("settings")} />
  
      <input type="radio" name="mode" id="mode-text" className="ui-state" checked={createMode === "text"} onChange={() => setCreateMode("text")} />
      <input type="radio" name="mode" id="mode-photo" className="ui-state" checked={createMode === "photo"} onChange={() => setCreateMode("photo")} />
  
      <input type="radio" name="visit" id="visit-yes" className="ui-state" checked={visitStatus === "yes"} onChange={() => setVisitStatus("yes")} />
      <input type="radio" name="visit" id="visit-no" className="ui-state" checked={visitStatus === "no"} onChange={() => setVisitStatus("no")} />
  
      <input type="radio" name="style" id="style-cute" className="ui-state" checked={styleTab === "cute"} onChange={() => setSelectedStyle("cute")} />
      <input type="radio" name="style" id="style-custom" className="ui-state" checked={styleTab === "custom"} onChange={() => setSelectedStyle("custom")} />
      <input type="radio" name="style" id="style-neat" className="ui-state" checked={styleTab === "neat"} onChange={() => setSelectedStyle("neat")} />

  <div id="photoModal" className="modal-overlay" style={{zIndex: "10008", display: activeModal === "photo" ? "flex" : "none"}} data-original-click={"closePhotoModal(event)"} onClick={closeModal}>
    <div style={{position: "relative", maxWidth: "90%", maxHeight: "90%", margin: "auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}} data-original-click={"event.stopPropagation()"} onClick={(event) => event.stopPropagation()}>
      <img id="expandedPhoto" src={expandedPhotoUrl} style={{width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)"}} />
      <div data-original-click={"closePhotoModal(event)"} onClick={closeModal} style={{position: "absolute", top: "-12px", right: "-12px", background: "#FFF", width: "32px", height: "32px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "16px", color: "var(--text-main)", cursor: "pointer", boxShadow: "var(--shadow-sm)"}}>×</div>
    </div>
  </div>

  <div id="createDetailsBackdrop" className={`half-modal-backdrop ${isCreateDetailsOpen ? "show" : ""}`} data-original-click={"closeCreateDetailsModal()"} onClick={() => setIsCreateDetailsOpen(false)} style={{zIndex: 899}}></div>
  <div id="createDetailsHalfModal" className={`half-modal create-details-half-modal ${isCreateDetailsOpen ? "open" : ""}`} onClick={(event) => event.stopPropagation()} style={{height: isCreateDetailsOpen ? "320px" : undefined}}>
    <div className="half-modal-handle" data-original-click={"closeCreateDetailsModal()"} role="button" tabIndex={0} onClick={() => setIsCreateDetailsOpen(false)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setIsCreateDetailsOpen(false); } }} data-original-keydown={"if(event.key==='Enter'||event.key===' '){ event.preventDefault(); closeCreateDetailsModal(); }"}></div>
    <div className="create-details-modal-header">
      <span className="label" style={{margin: "0"}}>📝 今日のメモを追加</span>
      <button type="button" className="create-details-modal-close" data-original-click={"closeCreateDetailsModal()"} onClick={() => setIsCreateDetailsOpen(false)} aria-label="閉じる">×</button>
    </div>
    <div id="createDetailsContent" className="create-details-modal-scroll">
      {/* 感情タグ */}
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"}}>
        <span className="label" style={{margin: "0"}}>🎭 感情・ムード</span>
        <div style={{display: "flex", gap: "6px"}}>
          <button type="button" data-original-click={"loadMoodPreset()"} onClick={loadMoodPreset} style={{background: "var(--input-bg)", border: "none", color: "var(--text-sub)", fontSize: "10px", padding: "4px 8px", borderRadius: "8px", fontWeight: "700", cursor: "pointer"}}>プリセット読込</button>
          <button type="button" data-original-click={"saveMoodPreset()"} onClick={saveMoodPreset} style={{background: "var(--primary-light)", border: "none", color: "var(--primary)", fontSize: "10px", padding: "4px 8px", borderRadius: "8px", fontWeight: "700", cursor: "pointer"}}>保存</button>
        </div>
      </div>
      <div className="tags-scroll-container create-details-tags-grid overflow-x-auto no-scrollbar" id="moodTagsArea" style={{marginBottom: "16px"}}>
        <div className="tag-row">
          {moodTags.filter((_, index) => index % 2 === 0).map((tag) => (
            <div key={tag} className={`chip${selectedMoodTags.includes(tag) ? " selected-mood-chip active" : ""}`} onClick={() => toggleStringValue(tag, setSelectedMoodTags)}>{tag}</div>
          ))}
        </div>
        <div className="tag-row">
          {moodTags.filter((_, index) => index % 2 === 1).map((tag) => (
            <div key={tag} className={`chip${selectedMoodTags.includes(tag) ? " selected-mood-chip active" : ""}`} onClick={() => toggleStringValue(tag, setSelectedMoodTags)}>{tag}</div>
          ))}
        </div>
      </div>

      {/* 事実タグ */}
      <span className="label">📝 今日の出来事（トピック）</span>
      <div className="tags-scroll-container create-details-tags-grid overflow-x-auto no-scrollbar" id="factTagsArea">
        <div className="tag-row">
          {factTags.filter((_, index) => index % 2 === 0).map((tag) => (
            <div key={tag} className={`chip${selectedFactTags.includes(tag) ? " selected-fact-chip active" : ""}`} onClick={() => toggleFactTag(tag)}>{tag}</div>
          ))}
        </div>
        <div className="tag-row">
          {factTags.filter((_, index) => index % 2 === 1).map((tag) => (
            <div key={tag} className={`chip${selectedFactTags.includes(tag) ? " selected-fact-chip active" : ""}`} onClick={() => toggleFactTag(tag)}>{tag}</div>
          ))}
        </div>
      </div>

      {/* 本文 */}
      <span className="label">📝 今日の出来事・接客メモ</span>
      <div className="textarea-wrapper">
        <textarea id="todayEpisodeInput" className="input-field" rows={4} placeholder="（例）こけてみんなで爆笑した！ウザ絡みされたけどシャンパン入れてくれた笑&#10;※AIが空気を読んで綺麗なメッセージにします✨" data-original-input={"autoScrollTextarea()"} value={todayEpisodeText} onChange={(event) => setTodayEpisodeText(event.target.value)} style={{background: "var(--input-bg)", border: "1px solid transparent", minHeight: "100px"}}></textarea>
        <div className="clear-btn" data-original-click={"clearEpisodeInput()"} onClick={() => { if (!todayEpisodeText && selectedFactTags.length === 0 && selectedMoodTags.length === 0) return; if (window.confirm("入力をクリアしますか？")) { setTodayEpisodeText(""); setSelectedFactTags([]); setSelectedMoodTags([]); } }}>🧹 クリア</div>
      </div>
    </div>
  </div>

  <div id="hiddenListModal" className="modal-overlay" style={{zIndex: "10005", display: activeModal === "hidden" ? "flex" : "none"}} onClick={closeModal}>
    <div className="modal-content" style={{maxHeight: "85dvh", display: "flex", flexDirection: "column"}} onClick={(event) => event.stopPropagation()}>
      <h2 style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}}>💤 非表示にした顧客</h2>
      <p style={{textAlign: "center", fontSize: "11px", color: "var(--text-sub)", marginTop: "-10px", marginBottom: "16px", fontWeight: "700"}}>カードを長押しして記録を確認</p>
      <div id="hiddenCustomersArea" style={{overflowY: "auto", flex: "1", paddingBottom: "8px", margin: "-10px"}}>
        {hiddenCustomers.length === 0 ? (
          <p style={{textAlign: "center", color: "var(--text-sub)", marginTop: "40px", fontWeight: "700"}}>非表示の顧客はいません</p>
        ) : hiddenCustomers.map((customer) => {
          const memos = parseMemoToJSON(customer.memo).filter((memo) => memo.type !== "sales");
          const lastMemo = memos[memos.length - 1];
          const previewMemo = lastMemo?.text ? `${String(lastMemo.text).substring(0, 30)}...` : "メモなし";
          const visibleTags = customer.tagsArray.filter((tag) => tag !== "ダミー" && tag !== "非表示" && tag !== "一軍固定");
          return (
            <div className="card compact-view" key={customer.id || customer.name} onClick={() => openEditCustomer(customer, true)} style={{padding: "12px 14px", marginBottom: "10px", boxShadow: "var(--shadow-sm)", cursor: "pointer"}}>
              <div style={{display: "flex", flexDirection: "column"}}>
                <div style={{display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", marginBottom: "4px"}}>
                  <b style={{fontSize: "15px", color: "var(--text-main)"}}>{customer.name}</b>
                  <button type="button" onClick={(event) => { event.stopPropagation(); restoreHiddenCustomer(customer); }} style={{background: "#F0FDF4", color: "#16A34A", border: "none", padding: "6px 10px", borderRadius: "999px", fontWeight: "700", fontSize: "11px", whiteSpace: "nowrap"}}>🟢 戻す</button>
                </div>
                <div className="card-tags" style={{marginTop: "2px", marginBottom: "4px"}}>
                  {visibleTags.length > 0 ? (
                    <div style={{display: "flex", gap: "4px", flexWrap: "wrap"}}>
                      {visibleTags.map((tag) => (
                        <span key={`${customer.id}-${tag}`} style={{background: "var(--primary-light)", color: "var(--primary)", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: "700"}}>#{tag}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div style={{fontSize: "12px", color: "var(--text-sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{previewMemo}</div>
              </div>
            </div>
          );
        })}
      </div>
      <button data-original-click={"closeHiddenListModal()"} onClick={closeModal} style={{width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", marginTop: "8px", flexShrink: 0}}>閉じる</button>
    </div>
  </div>

  <div id="setupModal" className="modal-overlay">
    <div className="modal-content" style={{textAlign: "center"}}>
      <h2 id="setup-title" style={{margin: "0 0 10px", fontWeight: "900", fontSize: "20px"}}>おしごとの種類をえらんでね🎀</h2>
      <p id="setup-desc" style={{color: "var(--text-sub)", fontSize: "13px", fontWeight: "700", marginBottom: "24px"}}>あとからマイページでも変えられます</p>
      <select id="initialBusinessType" className="input-field" style={{marginBottom: "24px", fontWeight: "700", textAlign: "center", background: "#FFF", border: "1px solid var(--border-color)"}}>
        <option value="cabaret">キャバクラ・ラウンジ</option>
        <option value="fuzoku">風俗・メンエス</option>
        <option value="garuba">ガルバ</option>
      </select>
      <button data-original-click={"saveInitialSetup()"} style={{width: "100%", background: "var(--primary)", color: "#FFF", border: "none", padding: "16px", borderRadius: "24px", fontWeight: "700", fontSize: "14px", boxShadow: "var(--shadow-float)"}}>はじめる ✨</button>
    </div>
  </div>

  <div id="styleModal" className="modal-overlay" style={{display: activeModal === "style" ? "flex" : "none"}} onClick={closeModal}>
    <div className="modal-content style-modal-content" onClick={(event) => event.stopPropagation()}>
      <h2 style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}}>🎨 AI口調・スタイル設定</h2>
      <div className="style-selector">
        <label htmlFor="style-cute" className="style-btn btn-cute">かわいい</label>
        <label htmlFor="style-custom" className="style-btn btn-custom">カスタム</label>
        <label htmlFor="style-neat" className="style-btn btn-neat">清楚</label>
      </div>
      <div className="style-content-wrapper">
        <div className="style-desc-cute">
          <div id="text-style-cute" className="style-desc-box">{STYLE_MODAL_TEXTS.cute}</div>
        </div>
        <div className="style-desc-custom">
          <div id="text-style-custom" className="style-desc-box">{STYLE_MODAL_TEXTS.custom}</div>
          <textarea id="customStyleText" className="input-field" placeholder={stylePlaceholder} value={customStyleText} onChange={(event) => { setCustomStyleText(event.target.value); localStorage.setItem("customStyleText", event.target.value); }} style={{height: "100px", marginBottom: "16px", fontSize: "13px", background: "#FFF", border: "1px solid var(--border-color)"}} data-original-change={"saveStyleSettings()"}></textarea>
          <div style={{display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "6px"}}><span>テンション（低）</span><span>（高）</span></div>
          <input type="range" id="tensionSlider" min="1" max="5" value={styleTension} onChange={(event) => { setStyleTension(event.target.value); localStorage.setItem("tensionSlider", event.target.value); }} style={{width: "100%", marginBottom: "16px"}} data-original-change={"saveStyleSettings()"} />
          <div style={{display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "6px"}}><span>絵文字の量（少）</span><span>（多）</span></div>
          <input type="range" id="emojiSlider" min="1" max="5" value={styleEmoji} onChange={(event) => { setStyleEmoji(event.target.value); localStorage.setItem("emojiSlider", event.target.value); }} style={{width: "100%", marginBottom: "10px"}} data-original-change={"saveStyleSettings()"} />
        </div>
        <div className="style-desc-neat">
          <div id="text-style-neat" className="style-desc-box">{STYLE_MODAL_TEXTS.neat}</div>
        </div>
      </div>
      <button data-original-click={"closeStyleModal()"} onClick={closeModal} style={{width: "100%", background: "var(--text-main)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", marginTop: "8px"}}>設定を保存して閉じる</button>
    </div>
  </div>

  <div id="helpModal" className="modal-overlay" style={{display: activeModal === "help" ? "flex" : "none"}} onClick={closeModal}>
    <div className="modal-content help-modal-content app-guide-modal" onClick={(event) => event.stopPropagation()}>
      <h2 id="helpModalTitle" className="app-guide-title">「きてほしい」と「ありがとう」を、もっと楽に。</h2>
      <div id="helpModalBody" className="help-body app-guide-body">
        <div className="app-guide-lead">
          このアプリは、あなたの指先の代わりにメッセージを考える「専属ライター」です✍️✨
        </div>

        <section className="app-guide-section">
          <h3>🌟 あなたにうれしい3つのこと</h3>
          <div className="app-guide-card">
            <div className="app-guide-icon">⏱️</div>
            <div><b>考える時間をゼロに</b><p>営業LINEやブログの「なに送ろう…」をAIが解決。</p></div>
          </div>
          <div className="app-guide-card">
            <div className="app-guide-icon">📈</div>
            <div><b>使うほど「あなたの声」に</b><p>お気に入りを保存すると、AIがあなたの「言葉のクセ」を学習します。</p></div>
          </div>
          <div className="app-guide-card">
            <div className="app-guide-icon">🌙☀️</div>
            <div><b>「人間らしさ」を再現</b><p>季節と曜日、初めての人と常連さん。その時の「心のゆらぎ」まで計算します。</p></div>
          </div>
        </section>

        <section className="app-guide-section">
          <h3>🧠 AIが読んでいる「ヒミツのヒント」</h3>
          <p className="app-guide-note">選んだボタンやメモは、すべてAIが大切な情報として読み取ります。</p>
          <div className="app-guide-mini-grid">
            <div><span>🏷️</span><b>タグ</b><p>お客様のタイプや、その日の出来事</p></div>
            <div><span>📝</span><b>メモ</b><p>あなただけが知っている小さなエピソード</p></div>
            <div><span>🔢</span><b>回数</b><p>これまで会った回数にぴったりの距離感</p></div>
          </div>
        </section>

        <div className="app-guide-footer">
          <b>🚀 もっとあなたらしく！</b>
          <p>「お気に入り」を登録して、AIをあなた色に育ててみてください。<br />あなたの個性を消さずに、もっと楽に、もっと伝わる。</p>
        </div>
      </div>
      <button data-original-click={"closeHelpModal()"} onClick={closeModal} style={{width: "100%", background: "var(--text-main)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700"}}>閉じる</button>
    </div>
  </div>

  <div id="deleteConfirmModal" className="modal-overlay" style={{zIndex: "10007", display: activeModal === "delete" ? "flex" : "none"}} onClick={() => setActiveModal("edit")}>
    <div className="modal-content cute-delete-confirm" onClick={(event) => event.stopPropagation()}>
      <div className="cute-delete-icon">🗑️</div>
      <h3 style={{margin: "0 0 8px", fontWeight: "900"}}>本当に削除する？</h3>
      <p style={{margin: "0 0 8px", fontSize: "12px", color: "var(--text-sub)", fontWeight: "700", lineHeight: 1.6}}>このお客様のカルテを完全に削除します。<br />この操作は元に戻せません。</p>
      <p style={{margin: "0 0 18px", fontSize: "14px", color: "var(--alert-text)", fontWeight: "900"}} id="deleteTargetName">{deleteTargetCustomer?.name ? `${deleteTargetCustomer.name} 様` : ""}</p>
      <div style={{display: "flex", gap: "10px"}}>
        <button type="button" data-original-click={"closeDeleteConfirmModal()"} onClick={() => setActiveModal("edit")} style={{flex: "1", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "12px", borderRadius: "16px", fontWeight: "700"}}>やめる</button>
        <button type="button" id="executeDeleteBtn" data-original-click={"executeDeleteCustomer()"} onClick={executeDeleteCustomer} style={{flex: "1", background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", padding: "12px", borderRadius: "16px", fontWeight: "900"}}>削除する</button>
      </div>
    </div>
  </div>

  <div id="editCustomerModal" className="modal-overlay" style={{zIndex: "10006", display: activeModal === "edit" ? "flex" : "none"}} onClick={closeEditModal}>
    <div className="modal-content modal-content--customer-edit" onClick={(event) => event.stopPropagation()}>
      <div className="modal-content__body">
      {isEditingHiddenCustomer ? (
        <button type="button" aria-label="完全に削除" onClick={openHiddenDeleteConfirm} style={{position: "absolute", top: "14px", right: "14px", width: "34px", height: "34px", borderRadius: "50%", border: "none", background: "var(--alert-bg)", color: "var(--alert-text)", fontSize: "16px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"}}>🗑️</button>
      ) : null}
      <h2 style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}} id="modalTitle">{isCreateCustomerMode ? "新規顧客の登録" : "顧客情報の編集"}</h2>
      <input type="hidden" id="editCustomerIndex" />
      <input type="hidden" id="isCreateMode" value={isCreateCustomerMode ? "true" : "false"} />
      <input type="hidden" id="editCustomerId" value={selectedCustomerId || ""} />

      <span className="label">名前</span>
      <input type="text" id="editCustomerName" className="input-field" value={editCustomerName} onChange={(event) => setEditCustomerName(event.target.value)} style={{marginBottom: "16px", background: "#FFF", border: "1px solid var(--border-color)"}} />

      <div className="accordion-header" data-original-click={"toggleTagAccordion()"} onClick={() => setIsTagAccordionOpen((isOpen) => !isOpen)}>
        <span>🏷️ 属性タグ</span><span id="tagAccordionIcon">{isTagAccordionOpen ? "▲" : "▼"}</span>
      </div>
      <div className={`accordion-content ${isTagAccordionOpen ? "open" : ""}`} id="tagAccordionContent">
        <div id="editAttributeTagsArea" className="overflow-y-auto" style={{display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px", maxHeight: "140px", overflowY: "auto"}}>
          {editAttributeOptions.map((tag) => {
            const isSelected = editAttributeTags.includes(tag);
            return (
              <div key={tag} className={`chip${isSelected ? " active" : ""}`} role="button" tabIndex={0} onClick={() => toggleStringValue(tag, setEditAttributeTags)} style={{background: isSelected ? "var(--primary)" : "#FFF", color: isSelected ? "#FFF" : "var(--text-main)", border: isSelected ? "1px solid transparent" : "1px solid var(--border-color)", boxShadow: isSelected ? "var(--shadow-sm)" : "none"}}>
                {tag}
              </div>
            );
          })}
        </div>
        <div style={{display: "flex", gap: "8px"}}>
          <input type="text" id="customAttrInput" className="input-field" placeholder="オリジナルタグ..." value={customAttrInput} onChange={(event) => setCustomAttrInput(event.target.value)} style={{padding: "10px", fontSize: "12px", background: "#FFF", border: "1px solid var(--border-color)"}} />
          <button id="addAttrBtn" data-original-click={"addCustomAttributeTag()"} onClick={addCustomAttributeTag} style={{background: "var(--primary)", color: "#FFF", border: "none", borderRadius: "10px", padding: "0 14px", fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap"}}>追加</button>
        </div>
      </div>

      <span className="label">📝 接客メモ</span>
      <div className="memo-blocks-wrapper"><div id="editMemoBlocksArea">
        {memoBlocks.length === 0 ? (
          <p style={{textAlign: "center", color: "var(--text-muted)", fontWeight: "700", padding: "20px"}}>過去の記録がありません</p>
        ) : memoBlocks.map((block) => {
          const tagsText = block.tags.length > 0 ? block.tags.map((tag) => `#${tag}`).join(" ") : "タグなし";
          const previewText = block.text ? block.text.split("\n")[0] : "本文なし";
          const typeBadge = block.type === "sales" ? <span style={{fontSize: "10px", background: "var(--sales-bg)", color: "var(--sales-text)", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", marginRight: "4px"}}>📱営業</span> : null;
          return (
            <div className={`memo-block${block.isExpanded ? " expanded" : ""}`} id={block.id} key={block.id} data-entry-id={block.entryId || ""} data-readonly={block.isReadOnly} data-type={block.type} data-status={block.status} data-photo={block.photoUrl || ""}>
              <div className="memo-summary" onClick={() => updateMemoBlock(block.id, { isExpanded: true })} style={{cursor: "pointer", display: block.isExpanded ? "none" : "block", padding: "4px"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px"}}>
                  <div className="memo-date-text" style={{fontSize: "12px", fontWeight: "700", color: "var(--text-sub)"}}>{typeBadge}{block.date}</div>
                  <div style={{position: "relative", zIndex: 10}}>{block.photoUrl ? <img src={block.photoUrl} style={{width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--border-color)", pointerEvents: "auto"}} onClick={(event) => { event.stopPropagation(); setExpandedPhotoUrl(block.photoUrl || ""); setActiveModal("photo"); }} /> : <div style={{width: "32px", height: "32px", borderRadius: "6px", background: "var(--input-bg)", border: "1px dashed var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "12px"}}>📷</div>}</div>
                </div>
                <div className="memo-tags-text" style={{fontSize: "11px", color: "var(--primary)", fontWeight: "700", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{tagsText}</div>
                <div className="memo-preview-text" style={{fontSize: "13px", color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{previewText}</div>
                <div style={{textAlign: "center", marginTop: "8px", fontSize: "10px", color: "var(--text-muted)", fontWeight: "700"}}>▼ タップして展開</div>
              </div>
              <div className="memo-detail" style={{display: block.isExpanded ? "block" : "none"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px"}}>
                  <div style={{display: "flex", alignItems: "center"}}>{block.isReadOnly ? typeBadge : <input type="date" className="memo-date" value={block.date} onChange={(event) => updateMemoBlock(block.id, { date: event.target.value })} style={{width: "fit-content", flex: "0 1 auto", padding: "4px 0"}} />}</div>
                  <div style={{position: "relative", zIndex: 10}}>{block.photoUrl ? <img src={block.photoUrl} style={{width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border-color)", cursor: "pointer", pointerEvents: "auto"}} onClick={(event) => { event.stopPropagation(); setExpandedPhotoUrl(block.photoUrl || ""); setActiveModal("photo"); }} /> : <div style={{width: "40px", height: "40px", borderRadius: "8px", background: "var(--input-bg)", border: "1px dashed var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px"}}>📷</div>}</div>
                </div>
                {block.isReadOnly ? (
                  <div style={{fontSize: "14px", color: "var(--text-main)", lineHeight: 1.6, marginTop: "4px", padding: "12px", background: "var(--input-bg)", borderRadius: "12px"}}>{block.text || "（本文なし）"}</div>
                ) : (
                  <textarea className="memo-text" rows={2} placeholder="エピソードを入力..." value={block.text} onChange={(event) => updateMemoBlock(block.id, { text: event.target.value })}></textarea>
                )}
                <div className="memo-tags-area" style={{marginTop: "8px", position: "relative"}}>
                  <div className="memo-selected-tags" style={{display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px"}}>
                    {block.tags.map((tag) => (
                      <span key={`${block.id}-${tag}`} style={{background: "var(--primary-light)", color: "var(--primary)", fontSize: "10px", padding: "3px 8px", borderRadius: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px"}}>
                        {tag}
                        {!block.isReadOnly ? <span onClick={() => removeMemoTag(block.id, tag)} style={{cursor: "pointer", fontWeight: "900", lineHeight: 1}}>×</span> : null}
                      </span>
                    ))}
                  </div>
                  {!block.isReadOnly ? <button type="button" className="memo-add-tag-btn" onClick={() => updateMemoBlock(block.id, { isDropdownOpen: !block.isDropdownOpen })} style={{background: "var(--primary-light)", border: "none", color: "var(--primary)", fontSize: "11px", padding: "6px 12px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", transition: "0.2s"}}>＋ エピソードタグを追加</button> : null}
                  <div className="memo-tag-dropdown" style={{display: block.isDropdownOpen ? "block" : "none", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "12px", marginTop: "10px", boxShadow: "var(--shadow-md)", position: "absolute", zIndex: 20, width: "100%"}}>
                    <div style={{position: "absolute", top: "-6px", left: "20px", width: "10px", height: "10px", background: "#FFF", borderTop: "1px solid var(--border-color)", borderLeft: "1px solid var(--border-color)", transform: "rotate(45deg)"}}></div>
                    <div className="memo-tag-dropdown-content" style={{display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "120px", overflowY: "auto"}}>
                      {lineFactTags.map((tag) => {
                        const isSelected = block.tags.includes(tag);
                        return <div key={`${block.id}-${tag}`} className={`chip${isSelected ? " selected-fact-chip active" : ""}`} onClick={() => toggleMemoTag(block.id, tag)}>{tag}</div>;
                      })}
                    </div>
                    <div style={{textAlign: "right", marginTop: "8px"}}>
                      <button type="button" onClick={() => updateMemoBlock(block.id, { isDropdownOpen: false })} style={{background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", cursor: "pointer"}}>閉じる</button>
                    </div>
                  </div>
                </div>
                {!block.isReadOnly ? (
                  <div className="memo-block__actions">
                    <button type="button" onClick={() => deleteMemoBlock(block.id)} style={{background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px"}}>🗑️</button>
                    <button
                      type="button"
                      disabled={isEditingDummyCustomer}
                      onClick={() => updateMemoBlock(block.id, { isExpanded: false })}
                      style={{
                        background: isEditingDummyCustomer ? "var(--input-bg)" : "var(--primary-gradient)",
                        color: isEditingDummyCustomer ? "var(--text-muted)" : "#FFF",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "20px",
                        fontWeight: "700",
                        fontSize: "13px",
                        boxShadow: isEditingDummyCustomer ? "none" : "var(--shadow-sm)",
                        opacity: isEditingDummyCustomer ? 0.55 : 1,
                        cursor: isEditingDummyCustomer ? "not-allowed" : "pointer",
                      }}
                    >
                      💾 このまま保存
                    </button>
                  </div>
                ) : null}
                <div onClick={() => updateMemoBlock(block.id, { isExpanded: false })} style={{textAlign: "center", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", marginTop: "12px", cursor: "pointer", padding: "8px 0"}}>▲ 閉じる</div>
              </div>
            </div>
          );
        })}
      </div></div>
      <div className="add-memo-btn" id="addMemoBtn" data-original-click={"addNewMemoBlock()"} onClick={addNewMemoBlock}>＋ 日付とエピソードを追加</div>

      </div>
      <div className="modal-content__footer">
      <div id="editActionArea" style={{display: "flex", gap: "10px"}}>
        <button type="button" data-original-click={"closeEditModal()"} onClick={closeEditModal} style={{flex: "1", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px"}} id="cancelBtn">閉じる</button>
        <button
          type="button"
          disabled={isEditingDummyCustomer}
          data-original-click={"saveCustomerEdit()"}
          id="saveCustomerBtn"
          onClick={saveCustomerEdit}
          style={{
            flex: "1",
            background: isEditingDummyCustomer ? "var(--input-bg)" : "var(--primary)",
            color: isEditingDummyCustomer ? "var(--text-muted)" : "#FFF",
            border: "none",
            padding: "14px",
            borderRadius: "20px",
            fontWeight: "700",
            fontSize: "13px",
            boxShadow: isEditingDummyCustomer ? "none" : "var(--shadow-float)",
            opacity: isEditingDummyCustomer ? 0.55 : 1,
            cursor: isEditingDummyCustomer ? "not-allowed" : "pointer",
          }}
        >
          保存する
        </button>
      </div>

      <div id="readOnlyActionArea" style={{display: "none", gap: "10px", flexDirection: "column"}}>
        <div style={{display: "flex", gap: "10px"}}>
          <button data-original-click={"restoreHiddenFromModal()"} style={{flex: "1", background: "#F0FDF4", color: "#16A34A", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px"}}>🟢 非表示を解除</button>
          <button data-original-click={"openDeleteConfirmModal()"} style={{flex: "1", background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px"}}>🗑️ 完全に削除</button>
        </div>
        <button data-original-click={"closeEditModal()"} style={{width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px"}}>閉じる</button>
      </div>
      </div>
    </div>
  </div>

  <div className="app-container">
    <header className="header-area">
      <div className="toggle-container header-toggle">
        <label htmlFor="mode-text" className="toggle-label toggle-text">💌 {modeLabels.thanks}</label>
        <label htmlFor="mode-photo" className="toggle-label toggle-photo">📸 {modeLabels.main}</label>
      </div>
    </header>

    <main ref={mainScrollAreaRef} className="scroll-area">
      {liffAuthStatus === "error" ? (
        <div
          role="alert"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            margin: "0 0 10px",
            padding: "12px 14px",
            borderRadius: "14px",
            background: "var(--alert-bg)",
            color: "var(--alert-text)",
            fontSize: "13px",
            fontWeight: 700,
            lineHeight: 1.5,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "10px",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span>LINEログインに失敗しました。LINEアプリから開くか、再読み込みしてください。</span>
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            style={{
              background: "#FFF",
              color: "var(--alert-text)",
              border: "1px solid rgba(0,0,0,0.12)",
              padding: "8px 14px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            再読み込み
          </button>
        </div>
      ) : null}
      <div className="page page-create">
        {/* 👤 誰に送る？ */}
        <div className="card card-customer-select">
          <span className="label">👤 誰に送る？ <span style={{fontSize: "11px", fontWeight: "normal", color: "var(--text-muted)"}}>(任意)</span></span>
          <div className="fade-scroll-wrapper">
            <div className="stories-scroll" id="quickAccessArea">
              {showCustomersDataSkeleton ? (
                <div className="story-item">
                  <div className="skeleton" style={{width: "58px", height: "58px", borderRadius: "50%", flexShrink: "0"}}></div>
                  <div className="skeleton" style={{width: "40px", height: "8px", borderRadius: "4px", marginTop: "4px"}}></div>
                </div>
              ) : quickAccessCustomers.length === 0 ? (
                <>
                  <div className="story-item" style={{cursor: "default"}}>
                    <div className="skeleton" style={{width: "58px", height: "58px", borderRadius: "50%", flexShrink: "0"}}></div>
                    <div className="skeleton" style={{width: "40px", height: "8px", borderRadius: "4px", marginTop: "4px"}}></div>
                  </div>
                  <div style={{color: "var(--text-muted)", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "62px"}}>見つかりません</div>
                </>
              ) : (
                quickAccessCustomers.map((customer) => {
                  const stats = getCustomerStats(customer);
                  const topBadge = stats.isVip
                    ? <div className="story-badge" style={{background: "var(--vip-border)", borderColor: "#FFF", color: "#A48624"}}>👑VIP</div>
                    : customer.tagsArray.length > 0
                      ? <div className="story-badge">{customer.tagsArray[0]}</div>
                      : null;
                  const ringClass = stats.isVip ? "story-ring story-ring-vip" : "story-ring";

                  return (
                    <div className="story-item" key={customer.id || customer.name} onClick={() => selectCustomer(customer)}>
                      <div className={ringClass}>
                        {topBadge}
                        <div className="story-inner" dangerouslySetInnerHTML={{__html: getAvatarSvgMarkup(customer.name, iconTheme)}}></div>
                      </div>
                      <span className="story-name">{customer.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div style={{position: "relative", flexShrink: "0"}}>
            <input type="text" id="nameInput" className="input-field" placeholder="名前を入力..." data-original-input={"suggestCustomer()"} value={nameInputValue} onChange={(event) => { setNameInputValue(event.target.value); if (selectedCustomer && event.target.value !== selectedCustomer.name) setSelectedCustomerId(null); }} />
            <div id="resultArea" className="result-box"></div>
          </div>
          <div className="past-memo-box" style={{marginTop: "12px", marginBottom: "0"}}>
            <div id="pastMemoDisplay"><span className="past-memo-label">📖 過去のメモ</span>{selectedCustomer ? (
              getPastMemos(selectedCustomer).length === 0 ? (
                <div style={{color: "var(--text-muted)", textAlign: "center", padding: "10px 0", fontSize: "12px"}}>(過去の記録はありません)</div>
              ) : (
                getPastMemos(selectedCustomer).map((memo, index) => (
                  <div key={`${memo.date || "memo"}-${index}`} style={{marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px dashed var(--border-color)", display: "flex", gap: "10px", alignItems: "flex-start"}}>
                    <div style={{flex: "1"}}>
                      <div style={{fontSize: "11px", color: "var(--text-sub)", fontWeight: "700", marginBottom: "4px"}}>{memo.date}</div>
                      <div style={{fontSize: "13px", color: "var(--text-main)"}}>{memo.text}</div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div style={{color: "var(--text-muted)", textAlign: "center", padding: "10px 0", fontSize: "12px"}}>(顧客を選択するか、過去の記録がありません)</div>
            )}</div>
          </div>
        </div>

        <div className="card mode-photo-ui">
          <span className="label">📷 写真を選ぶ</span>
          <input type="file" id="photoUpload" accept="image/*" style={{display: "none"}} data-original-change={"previewPhoto(event)"} />
          <label htmlFor="photoUpload" id="uploadArea" className="upload-area">
            <div id="uploadText">📸<br /><br />タップして写真をアップロード</div>
            <img id="photoPreview" alt="" />
          </label>
        </div>

        {/* 🚶‍♀️ 来店あり/なし トグル */}
        <div className="mode-text-only" style={{marginBottom: "16px", display: "flex", justifyContent: "center"}}>
          <div style={{width: "100%", maxWidth: "240px"}}>
            <div className="visit-toggle-hint">
              <span className="hint-text hint-yes">「ありがとう」をつたえる</span>
              <span className="hint-text hint-no">「きてほしい」をつたえる</span>
            </div>
            <div className="toggle-container visit-toggle">
              <label htmlFor="visit-yes" className="toggle-label visit-label-yes">🚶‍♀️ 来店あり</label>
              <label htmlFor="visit-no" className="toggle-label visit-label-no">📱 来店なし(営業)</label>
            </div>
          </div>
        </div>

        {/* 📝 今日のメモを追加 */}
        <div style={{textAlign: "center", margin: "12px 0"}}>
          <div className="accordion-header" data-original-click={"toggleCreateDetails()"} id="createDetailsHeader" onClick={() => setIsCreateDetailsOpen((isOpen) => !isOpen)} style={{display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 24px", background: "#FFF", border: "1px solid var(--border-color)", borderRadius: "24px", fontSize: "12px", fontWeight: "700", color: "var(--text-main)", boxShadow: "var(--shadow-sm)", cursor: "pointer", transform: "translateY(-20px)"}}>
            📝 今日のメモを追加 <span style={{color: "var(--text-sub)", fontSize: "11px", fontWeight: "normal"}}>(任意)</span> <span id="createDetailsIcon">{isCreateDetailsOpen ? "▲" : "▼"}</span>
          </div>
        </div>

        <div id="inlineResultArea" ref={inlineResultRef} className="card" style={{display: isInlineResultVisible ? "block" : "none", border: "1px solid var(--primary-light)", background: "#FFF", marginTop: "24px", position: "relative"}}>
          <textarea id="inlineResultText" className="input-field" value={inlineResultText} onChange={(event) => setInlineResultText(event.target.value)} style={{height: "200px", lineHeight: "1.6", fontSize: "14px", marginBottom: "12px", resize: "vertical"}} placeholder="ここに生成された文章が表示されます。自由に修正できます。"></textarea>
          <input type="hidden" id="currentEntryId" value={currentEntryId} />
          <h3 style={{textAlign: "center", marginBottom: "6px", color: "var(--primary)", fontSize: "16px"}}>✨ 執筆完了！</h3>
          <div style={{textAlign: "center", fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "16px"}}>
            💡 自由に手直しOK！送信・コピー時に履歴に上書き保存されるよ✨
          </div>
          <div style={{display: "flex", gap: "10px"}}>
            <button data-original-click={"copyInlineResult()"} onClick={copyInlineResult} style={{flex: "1", background: "#FFF", color: "var(--primary)", border: "2px solid var(--primary)", padding: "12px", borderRadius: "24px", fontWeight: "700"}}>
              📋 コピー
            </button>
            <button data-original-click={"sendInlineToLine()"} onClick={sendInlineToLine} style={{flex: "1", background: "var(--primary)", color: "#FFF", border: "none", padding: "12px", borderRadius: "24px", fontWeight: "700"}}>
              💬 LINE送信
            </button>
          </div>
        </div>

        {/* 💎 CTA 下部固定浮遊 */}
        <div className="sticky-submit" style={{pointerEvents: "auto"}}>
          <button className="submit-btn" id="submitBtn" data-original-click={"generateDiary()"} onClick={generateDiary} disabled={isGenerating || !sessionReady} style={{pointerEvents: "auto"}}>{isGenerating ? "執筆中..." : "✨ AIで作成する"}</button>
        </div>

      </div>

      <div className="page page-data">
        <div id="dataStickyHeader" style={{position: "sticky", top: "-10px", zIndex: "10", margin: "-10px -16px 0", padding: "10px 16px 0"}}>
          <div style={{position: "absolute", top: "0", left: "0", width: "100%", height: "100%", background: "var(--header-bg)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: "-1", borderBottom: "1px solid var(--border-color)"}}></div>

          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px"}}>
            <h2 style={{margin: "0", fontWeight: "700", fontSize: "18px"}}>お客様ノート</h2>
            <div className="view-toggle" data-original-click={"toggleCompactMode()"} onClick={toggleCompactMode}><span id="viewIcon">{isCompactMode ? "📋 すっきり" : "🗂️ くわしく"}</span></div>
          </div>

          <div style={{display: "flex", justifyContent: "center", marginBottom: "12px"}}>
            <div className="visit-toggle data-view-toggle" style={{maxWidth: "280px", padding: "4px"}}>
              <input type="radio" name="data-view" id="view-customer" className="ui-state" checked={dataView === "customer"} onChange={() => setDataView("customer")} />
              <input type="radio" name="data-view" id="view-history" className="ui-state" checked={dataView === "history"} onChange={() => setDataView("history")} />
              <div className="toggle-container" style={{background: "transparent", boxShadow: "none"}}>
                <label htmlFor="view-customer" className="toggle-label" style={{fontSize: "13px", zIndex: "2"}}>👥 お客様ノート</label>
                <label htmlFor="view-history" className="toggle-label" style={{fontSize: "13px", zIndex: "2"}}>📝 作った文章</label>
              </div>
            </div>
          </div>

          <div
            className={`data-customer-search-clip${dataView === "customer" && !isCustomerSearchBarVisible ? " data-customer-search-clip--hidden" : ""}`}
            style={{ display: dataView === "customer" ? "block" : "none" }}
          >
            <div className="data-customer-search-inner">
              <div id="searchContainer" style={{ position: "relative", marginBottom: "8px" }}>
                <input
                  type="text"
                  id="customerSearch"
                  className="input-field"
                  placeholder="名前、タグ、メモで検索..."
                  data-original-input={"filterCustomerList()"}
                  value={customerSearchText}
                  onChange={(event) => setCustomerSearchText(event.target.value)}
                  onFocus={() => {
                    customerSearchInputFocusedRef.current = true;
                    customerSearchBarVisibleRef.current = true;
                    setIsCustomerSearchBarVisible(true);
                  }}
                  onBlur={() => {
                    customerSearchInputFocusedRef.current = false;
                  }}
                  style={{ paddingRight: "36px", background: "#FFF", border: "1px solid var(--border-color)" }}
                />
                <div
                  id="clearSearchBtn"
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0,0,0,0.05)",
                    color: "var(--text-sub)",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    display: customerSearchText ? "flex" : "none",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                  data-original-click={"clearSearch()"}
                  onClick={() => setCustomerSearchText("")}
                >
                  ×
                </div>
              </div>
            </div>
          </div>

          <div className="filter-container" ref={filterContainerRef} style={{paddingBottom: "10px", marginBottom: "0", display: dataView === "customer" ? "flex" : "none"}}>
            <div ref={(element) => { filterButtonRefs.current.alert = element; }} className={`filter-btn ${currentListFilter === "alert" ? "active-filter" : ""}`} id="filter-btn-alert" data-original-click={"setListFilter('alert')"} onClick={() => setListFilter("alert")}>
              ⚠️ 要連絡
              <div id="alertBadge" style={{display: alertCount > 0 ? "flex" : "none", position: "absolute", top: "-6px", right: "-6px", background: "var(--alert-text)", color: "#FFF", fontSize: "9px", fontWeight: "700", minWidth: "16px", height: "16px", borderRadius: "8px", padding: "0 4px", alignItems: "center", justifyContent: "center"}}>{alertCount}</div>
            </div>
            <div ref={(element) => { filterButtonRefs.current.all = element; }} className={`filter-btn ${currentListFilter === "all" ? "active-filter" : ""}`} id="filter-btn-all" data-original-click={"setListFilter('all')"} onClick={() => setListFilter("all")}>すべて</div>
            <div ref={(element) => { filterButtonRefs.current.vip = element; }} className={`filter-btn ${currentListFilter === "vip" ? "active-filter" : ""}`} id="filter-btn-vip" data-original-click={"setListFilter('vip')"} onClick={() => setListFilter("vip")}>💎 一軍</div>
            <div ref={(element) => { filterButtonRefs.current.new = element; }} className={`filter-btn ${currentListFilter === "new" ? "active-filter" : ""}`} id="filter-btn-new" data-original-click={"setListFilter('new')"} onClick={() => setListFilter("new")}>🔰 新規</div>
            <div ref={(element) => { filterButtonRefs.current.second = element; }} className={`filter-btn ${currentListFilter === "second" ? "active-filter" : ""}`} id="filter-btn-second" data-original-click={"setListFilter('second')"} onClick={() => setListFilter("second")}>✌️ 2回目</div>
            <div ref={(element) => { filterButtonRefs.current.regular = element; }} className={`filter-btn ${currentListFilter === "regular" ? "active-filter" : ""}`} id="filter-btn-regular" data-original-click={"setListFilter('regular')"} onClick={() => setListFilter("regular")}>👑 常連</div>
          </div>
        </div>

        <div id="customerListArea" className={isCompactMode ? "compact-view" : ""} onClick={() => setActiveCustomerMenuId(null)} style={{marginTop: "12px", position: "relative", zIndex: "1", display: dataView === "customer" ? "block" : "none"}}>
          {showCustomersDataSkeleton ? (
            <>
              <div className="card skeleton" style={{height: "80px", marginBottom: "12px"}}></div>
              <div className="card skeleton" style={{height: "80px", marginBottom: "12px"}}></div>
            </>
          ) : filteredCustomers.length === 0 ? (
            <div className="card" style={{textAlign: "center", padding: "28px 18px", color: "var(--text-sub)"}}>
              <div style={{fontSize: "28px", marginBottom: "8px"}}>🗂️</div>
              <div style={{fontWeight: "700", marginBottom: "6px"}}>顧客データがありません</div>
              <div style={{fontSize: "13px", lineHeight: "1.6"}}>顧客を追加するか、検索条件を見直してください。</div>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const stats = getCustomerStats(customer);
              let sysBadge = "";
              if (stats.count === 1) sysBadge = "🔰 新規";
              else if (stats.count === 2) sysBadge = "✌️ 2回目";
              else if (stats.count >= 3) sysBadge = "👑 常連";
              if (customer.tagsArray.includes("一軍固定")) sysBadge = "💎 固定一軍";

              const visibleTags = customer.tagsArray.filter((tag) => tag !== "ダミー" && tag !== "非表示" && tag !== "一軍固定");
              const memos = parseMemoToJSON(customer.memo).filter((memo) => memo.type !== "sales");
              const lastMemo = memos[memos.length - 1];
              const previewMemo = lastMemo
                ? lastMemo.text
                  ? `${String(lastMemo.text).substring(0, 40)}...`
                  : Array.isArray(lastMemo.tags) && lastMemo.tags.length > 0
                    ? lastMemo.tags.join(", ")
                    : "メモなし"
                : "メモなし";
              const isMenuOpen = activeCustomerMenuId === customer.id;
              const isHiding = Boolean(customer.id && hidingCustomerIds.includes(customer.id));
              const isVipBouncing = Boolean(customer.id && vipBounceCustomerIds.includes(customer.id));
              const cardClass = `${stats.isVip ? "card card-vip" : "card"} customer-list-card${isHiding ? " customer-card-hiding" : ""}`;

              return (
                <div className={cardClass} key={customer.id || customer.name} onPointerDown={(event) => startCustomerLongPress(customer, event)} onPointerUp={clearCustomerLongPress} onPointerCancel={clearCustomerLongPress} onPointerLeave={clearCustomerLongPress}>
                  {isMenuOpen ? (
                    <div className="customer-context-menu" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                      {!customer.isMasterDummy ? (
                        <button type="button" onClick={() => toggleCustomerVip(customer)}>{customer.tagsArray.includes("一軍固定") ? "👑 一軍解除" : "👑 一軍へ"}</button>
                      ) : null}
                      <button type="button" onClick={() => hideCustomerOptimistically(customer)}>👻 非表示</button>
                    </div>
                  ) : null}
                  <div className="card-inner" style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                    <div style={{flex: "1", marginRight: "10px", overflow: "hidden", position: "relative"}}>
                      <div style={{display: "flex", alignItems: "flex-start"}}>
                        <div style={{width: "28px", height: "28px", borderRadius: "50%", flexShrink: "0", marginRight: "6px", overflow: "hidden"}} dangerouslySetInnerHTML={{__html: getAvatarSvgMarkup(customer.name, iconTheme)}}></div>
                        {sysBadge ? <span className={isVipBouncing ? "vip-bounce-badge" : ""} style={{background: "var(--input-bg)", color: "var(--text-sub)", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", border: "1px solid transparent", marginRight: "6px", display: "inline-block", flexShrink: "0", whiteSpace: "nowrap", height: "fit-content"}}>{sysBadge}</span> : null}
                        <b style={{fontSize: "15px", lineHeight: "1.4", wordBreak: "break-word", color: "var(--text-main)"}}>{customer.name}</b>
                      </div>
                      <small className="card-memo" style={{color: "var(--text-sub)", display: "block", marginTop: "4px", lineHeight: "1.4"}}>{previewMemo}</small>
                      <div className="card-tags" style={{marginTop: "6px"}}>
                        {visibleTags.length > 0 ? (
                          <div style={{display: "flex", gap: "4px", flexWrap: "wrap"}}>
                            {visibleTags.map((tag) => (
                              <span key={tag} style={{background: "var(--primary-light)", color: "var(--primary)", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: "700"}}>#{tag}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="card-actions" style={{display: "flex", flexDirection: "column", gap: "6px", flexShrink: "0", position: "relative", zIndex: "10"}}>
                      <button type="button" className="action-btn" onClick={(event) => { event.stopPropagation(); selectCustomer(customer); }} style={{background: "var(--primary-light)", color: "var(--primary)", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", transition: "0.2s"}}><span className="action-icon" style={{fontSize: "14px"}}>✏️</span><span className="action-text">{modeLabels.thanks}作成</span></button>
                      <button type="button" className="action-btn" onClick={(event) => { event.stopPropagation(); openEditCustomer(customer); }} style={{background: "var(--input-bg)", color: "var(--text-sub)", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", transition: "0.2s"}}>
                        {customer.isMasterDummy || customer.tagsArray.includes("ダミー") ? (
                          <>
                            <span className="action-icon" style={{fontSize: "14px"}}>🔍</span>
                            <span className="action-text">閲覧</span>
                          </>
                        ) : (
                          <>
                            <span className="action-icon" style={{fontSize: "14px"}}>⚙️</span>
                            <span className="action-text">編集</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div id="historyListArea" style={{display: dataView === "history" ? "block" : "none", marginTop: "12px", position: "relative", zIndex: "1"}}>
          {showCustomersDataSkeleton ? (
            <>
              <div className="card skeleton" style={{height: "112px", marginBottom: "12px"}} />
              <div className="card skeleton" style={{height: "112px", marginBottom: "12px"}} />
              <div className="card skeleton" style={{height: "112px", marginBottom: "12px"}} />
            </>
          ) : historyItems.length === 0 ? (
            <div style={{textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontWeight: "700", fontSize: "13px"}}>作った文章はまだありません<br /><span style={{fontSize: "11px", fontWeight: "normal", marginTop: "8px", display: "inline-block"}}>AIでメッセージを作るとここに保存されます</span></div>
          ) : (
            <>
              {currentFavoriteIds.length === 0 ? (
                <div style={{background: "var(--primary-light)", border: "1px dashed var(--primary)", borderRadius: "16px", padding: "12px", marginBottom: "16px", textAlign: "center", boxShadow: "var(--shadow-sm)"}}>
                  <div style={{fontSize: "16px", marginBottom: "4px"}}>🎀</div>
                  <div style={{fontSize: "12px", fontWeight: "700", color: "var(--primary)", lineHeight: 1.5}}>
                    ヒント：うまく書けた文章は「☆」をタップしてね！<br />
                    お気に入りに登録すると、AIがあなたの口調を学習するよ✨
                  </div>
                </div>
              ) : null}
              {historyItems.map((item, index) => {
              const itemId = String(item.id || "");
              const viewId = itemId || `history-${index}`;
              const isExpanded = expandedHistoryIds.includes(viewId);
              const isEditing = editingHistoryId === itemId;
              const isFavorite = currentFavoriteIds.includes(itemId);
              const editText = historyEditTexts[itemId] ?? item.displayText;
              const editLineCount = editText.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(Array.from(line).length / 22)), 0);
              const editHeight = Math.max(120, (editLineCount * 21) + 24);
              return (
                <div className="history-card" key={item.id || `${item.customerName}-${item.displayDate}`}>
                  <div className="history-header">
                    <div>
                      <div style={{fontWeight: "700", fontSize: "14px", color: "var(--text-main)", marginBottom: "4px"}}>{item.customerName} 様宛</div>
                      <div style={{fontSize: "11px", color: "var(--text-sub)"}}>{item.displayDate}</div>
                      <div style={{marginTop: "4px"}}>
                        {item.customerTags.slice(0, 3).map((tag) => (
                          <span key={`${item.id}-${tag}`} style={{background: "var(--primary-light)", color: "var(--primary)", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", marginRight: "4px"}}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className={`favorite-btn ${isFavorite ? "active" : ""}`} onClick={() => toggleFavoriteHistory(item)}>{isFavorite ? "♥" : "☆"}</div>
                  </div>
                  <div id={`history-view-${viewId}`} className={`history-text ${isExpanded ? "" : "collapsed"}`} onClick={() => toggleHistoryText(viewId)} style={{display: isEditing ? "none" : undefined}}>{item.displayText}</div>
                  <textarea id={`history-edit-${itemId}`} className="input-field" value={editText} onChange={(event) => setHistoryEditTexts((current) => ({ ...current, [itemId]: event.target.value }))} style={{display: isEditing ? "block" : "none", height: `${editHeight}px`, minHeight: `${editHeight}px`, boxSizing: "border-box", overflowY: "hidden", marginTop: "8px", fontSize: "13px", lineHeight: "1.6", background: "#FFF", border: "1px solid var(--primary)", padding: "12px"}} />
                  <div style={{display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px", borderTop: "1px dashed var(--border-color)", paddingTop: "8px"}}>
                    <button type="button" id={`history-save-btn-${itemId}`} onClick={() => saveAndCopyHistory(item)} style={{display: isEditing ? "block" : "none", background: "var(--primary)", color: "#FFF", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "0.2s"}}>📋 コピーして保存</button>
                    <button type="button" id={`history-edit-btn-${itemId}`} onClick={() => isEditing ? cancelEditHistory(itemId) : enableEditHistory(item)} style={{background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "0.2s"}}>{isEditing ? "✖ キャンセル" : "✏️ 編集"}</button>
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
        <div className="fab" role="button" tabIndex={0} data-original-click={"openCreateModal()"} onClick={openCreateCustomerModal} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCreateCustomerModal(); } }} data-original-keydown={"if(event.key==='Enter'||event.key===' '){ event.preventDefault(); openCreateModal(); }"} style={{display: dataView === "customer" ? "flex" : "none"}}>＋</div>
      </div>

      <div className="page page-settings" style={{position: "relative"}}>
        <h2 style={{margin: "0 0 14px", fontWeight: "700", fontSize: "18px"}}>マイページ・設定</h2>

        <div className="settings-stack">
          <div className="card settings-card settings-card-main" data-original-click={"openStyleModal()"} onClick={() => setActiveModal("style")}>
            <div className="setting-card-title">🎨 AIスタイル・口調設定</div>
            <div className="setting-card-desc">文章の雰囲気を、あなたらしく整えます</div>
            <span className="settings-val" id="styleOverviewText">かわいい・カスタム・清楚</span>
          </div>

          <div className="settings-pair-grid">
            <div className="card settings-card settings-card-select">
              <div className="setting-card-title">💎 アイコンテーマ</div>
              <select id="icon-theme-select" className="input-field" value={iconTheme} onChange={(event) => setSelectedIconTheme(event.target.value as IconTheme)} style={{width: "100%", padding: "12px", fontWeight: "700"}}>
                <option value="glass">🥂 グラス</option>
                <option value="jewel">💎 ジュエル</option>
                <option value="perfume">🧴 パフューム</option>
                <option value="moon_star">🌙 ムーン＆スター</option>
                <option value="flower">🌹 フラワー</option>
                <option value="teacup">☕ ティーカップ</option>
                <option value="symbol">♠️ カラーサークル</option>
              </select>
            </div>
            <div className="card settings-card settings-card-select">
              <div className="setting-card-title">🏢 お店のジャンル</div>
              <select className="input-field" id="businessType" data-original-change={"updateChipsAndSave()"} value={selectedBusinessType} onChange={(event) => setBusinessType(event.target.value as BusinessType)} style={{width: "100%", padding: "12px", fontSize: "13px", fontWeight: "700", marginBottom: 0}}>
                <option value="cabaret">キャバクラ</option>
                <option value="fuzoku">風俗・メンエス</option>
                <option value="garuba">ガルバ</option>
              </select>
            </div>
          </div>

          <div className="card settings-card">
            <div className="setting-card-title">🌈 テーマカラー</div>
            <div className="settings-option-grid">
              {APP_THEME_OPTIONS.map((option) => (
                <button type="button" key={option.value} className={`settings-choice ${appTheme === option.value ? "active" : ""}`} onClick={() => setSelectedAppTheme(option.value)}>
                  <b>{option.label}</b>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card settings-card">
            <div className="setting-card-title">🔤 フォント</div>
            <div className="settings-option-grid">
              {APP_FONT_OPTIONS.map((option) => (
                <button type="button" key={option.value} className={`settings-choice ${appFont === option.value ? "active" : ""}`} onClick={() => setSelectedAppFont(option.value)}>
                  <b>{option.label}</b>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card settings-card" style={{ marginTop: "6px" }}>
          <div className="setting-card-title">🧪 サンプル顧客の表示</div>
          <p style={{ fontSize: "12px", color: "var(--text-sub)", fontWeight: "600", margin: "0 0 12px", lineHeight: 1.55 }}>
            リストから非表示にしたお試しサンプルのみ、まとめて再表示します。
          </p>
          <button
            type="button"
            onClick={resetHiddenDummyCustomers}
            style={{
              width: "100%",
              background: "var(--primary-light)",
              color: "var(--primary)",
              border: "1px solid var(--primary-light)",
              padding: "14px",
              borderRadius: "16px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            サンプル顧客の非表示をリセット（すべて再表示）
          </button>
        </div>

        <div className="card settings-alert-card">
          <div style={{color: "var(--alert-text)", fontWeight: "700", fontSize: "13px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px"}}>💌 そろそろ連絡？お知らせ設定</div>
          <div style={{display: "flex", gap: "12px"}}>
            <div style={{flex: "1", textAlign: "center"}}>
              <div style={{fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "6px"}}>🔰 新規</div>
              <input type="number" id="alert-new" className="input-field" style={{padding: "10px 0", textAlign: "center", fontSize: "15px", borderRadius: "12px", width: "100%", boxSizing: "border-box", background: "#FFF", border: "1px solid var(--border-color)"}} value="7" data-original-change={"saveAlertSettings()"} />
            </div>
            <div style={{flex: "1", textAlign: "center"}}>
              <div style={{fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "6px"}}>👑 常連</div>
              <input type="number" id="alert-regular" className="input-field" style={{padding: "10px 0", textAlign: "center", fontSize: "15px", borderRadius: "12px", width: "100%", boxSizing: "border-box", background: "#FFF", border: "1px solid var(--border-color)"}} value="30" data-original-change={"saveAlertSettings()"} />
            </div>
            <div style={{flex: "1", textAlign: "center"}}>
              <div style={{fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "6px"}}>💎 VIP</div>
              <input type="number" id="alert-vip" className="input-field" style={{padding: "10px 0", textAlign: "center", fontSize: "15px", borderRadius: "12px", width: "100%", boxSizing: "border-box", background: "#FFF", border: "1px solid var(--border-color)"}} value="14" data-original-change={"saveAlertSettings()"} />
            </div>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-item" data-original-click={"openHiddenListModal()"} onClick={() => setActiveModal("hidden")}><span>💤 非表示にした顧客</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
          <div className="settings-item" data-original-click={"openHelpModal()"} onClick={() => setActiveModal("help")}><span>📖 アプリの使い方と仕様（必読）</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
        </div>
        <div className="settings-list" style={{marginBottom: "40px"}}>
          <div className="settings-item" data-original-click={"alert('利用規約のページが開きます')"} onClick={() => showNotice("利用規約のページが開きます")}><span>📄 利用規約</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
          <div className="settings-item" data-original-click={"alert('プライバシーポリシーのページが開きます')"} onClick={() => showNotice("プライバシーポリシーのページが開きます")}><span>🛡 プライバシーポリシー</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
          <div className="settings-item"><span>ℹ️ バージョン</span><span className="settings-val">11.0.0 (Stable)</span></div>
        </div>

        <div data-original-click={"promptDevMode()"} onClick={() => showNotice("開発者モード")} style={{position: "absolute", bottom: "10px", right: "10px", fontSize: "11px", color: "var(--text-muted)", cursor: "pointer", userSelect: "none"}}>dev</div>
      </div>
    </main>

    <footer className="fixed-footer">
      <nav className="bottom-nav">
        <label htmlFor="nav-create" className="nav-item tab-create" onClick={() => { setActiveTab("create"); setIsCreateDetailsOpen(false); }}><span style={{fontSize: "18px"}}>📝</span>作成</label>
        <label htmlFor="nav-data" className="nav-item tab-data" onClick={() => { setActiveTab("data"); setIsCreateDetailsOpen(false); }}><span style={{fontSize: "18px"}}>📖</span>顧客</label>
        <label htmlFor="nav-settings" className="nav-item tab-settings" onClick={() => { setActiveTab("settings"); setIsCreateDetailsOpen(false); }}><span style={{fontSize: "18px"}}>⚙️</span>設定</label>
      </nav>
    </footer>
  </div>
    </>
  );
}
