"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type ActiveTab = "create" | "data" | "settings";
type CreateMode = "text" | "photo";
type VisitStatus = "yes" | "no";
type StyleTab = "cute" | "custom" | "neat";
type DataView = "customer" | "history";
type BusinessType = "cabaret" | "fuzoku" | "host";
type ListFilter = "alert" | "all" | "vip" | "new" | "second" | "regular";
type IconTheme = "glass" | "jewel" | "perfume" | "moon_star" | "flower" | "teacup" | "symbol";

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

const LIFF_ID = "2009902106-W8zW5hJA";
const DEFAULT_USER_ID = "test-user";

interface CustomerEntry {
  id?: string | null;
  date?: string;
  text?: string;
  tags?: string[];
  photoUrl?: string;
  type?: string;
  status?: string;
}

interface Customer {
  id: string | null;
  name: string;
  memo?: string;
  tags?: string;
  entries: CustomerEntry[];
  tagsArray: string[];
}

const INDUSTRY_MOOD_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: ["💖 大好き", "✨ 特別な存在", "🥂 一緒に飲みたい", "🥺 早く会いたい", "🤫 ナイショの話", "💕 ずっと一緒にいたい", "🧸 癒やされる", "🍼 頼りにしてる", "💋 ドキドキ", "👗 可愛くなりたい", "🥺 寂しいな", "📱 連絡きて嬉しい", "🖤 独占してほしい", "🎉 楽しすぎた！", "💖 いつもありがとう"],
  fuzoku: ["💖 あなたが特別", "🧸 癒やされた", "🤤 余韻", "💕 相性良すぎ", "🥺 一緒にいたかった", "🤫 2人の秘密", "💋 ドキドキした", "🍼 甘えちゃった", "🖤 独占したい", "🥺 早く会いたい", "✨ 楽しかった", "📱 連絡待ってる", "🥺 依存しちゃいそう", "💖 感謝", "💤 夢で会いたい"],
  host: ["👑 お前が一番", "🖤 誰にも渡さない", "🐶 もっと甘やかして", "🥺 会いたくて狂いそう", "✨ 特別なお姫様", "🥂 一緒に酔いたい", "🍼 お前しか無理", "🤫 2人だけの内緒", "💕 愛してる", "🥺 今すぐ会いに来て", "📱 返事待ってる", "💪 絶対ナンバーワン", "🧸 一緒にいると安心", "🎉 最高に楽しかった", "💖 いつも感謝"],
};

const INDUSTRY_ATTRIBUTE_TAGS: Record<BusinessType, string[]> = {
  cabaret: ["太客", "細客", "常連", "新規", "痛客", "お酒好き", "下戸", "金持ち", "ケチ", "既婚", "独身", "おじさん", "若者", "イケメン", "優しい"],
  fuzoku: ["M気質", "S気質", "常連", "新規", "キモい", "優しい", "痛客", "匂いキツめ", "マナー良", "本番要求", "おじさん", "若者", "イケメン", "デブ", "ハゲ"],
  host: ["太客", "細客", "エース", "痛客", "常連", "新規", "メンヘラ", "金持ち", "ケチ", "酒癖悪い", "マナー良", "独身", "既婚", "若者", "おばさん"],
};

const INDUSTRY_FACT_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: ["✨ 本指名", "🥂 同伴", "🍾 シャンパン", "👗 新衣装", "💇‍♀️ ヘアメ", "🍷 ワイン", "🎤 カラオケ", "🍰 アフター", "🎁 プレゼント"],
  fuzoku: ["✨ 本指名", "🏩 ロング", "🔞 濃厚", "🧴 メンエス", "💋 キス", "🛁 シャワー", "🧼 泡泡", "💆‍♂️ マッサージ", "🦶 足ツボ", "🛌 延長"],
  host: ["🍾 オリシャン", "🎤 ラスソン", "🥂 アフター", "💸 エース", "👑 枕", "💸 痛客", "🍾 タワー", "🍷 高額ボトル", "🌟 Ｎｏ.１"],
};

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
  if (businessType === "host") return "ホスト客";
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
}): Customer {
  return {
    ...customer,
    id: customer.id || null,
    name: customer.name || "",
    memo: customer.memo || "",
    tags: customer.tags || "",
    entries: Array.isArray(customer.entries) ? customer.entries : [],
    tagsArray: customer.tags ? customer.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
  };
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");
  const [createMode, setCreateMode] = useState<CreateMode>("text");
  const [visitStatus, setVisitStatus] = useState<VisitStatus>("yes");
  const [styleTab, setStyleTab] = useState<StyleTab>("cute");
  const [dataView, setDataView] = useState<DataView>("customer");
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [customerData, setCustomerData] = useState<Customer[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [nameInputValue, setNameInputValue] = useState("");
  const [isCreateDetailsOpen, setIsCreateDetailsOpen] = useState(false);
  const [isTagAccordionOpen, setIsTagAccordionOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<null | "style" | "help" | "hidden" | "photo" | "edit">(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState("");
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>("cabaret");
  const [iconTheme, setIconTheme] = useState<IconTheme>("glass");
  const [currentListFilter, setCurrentListFilter] = useState<ListFilter>("all");
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([]);
  const [selectedFactTags, setSelectedFactTags] = useState<string[]>([]);
  const [editAttributeTags, setEditAttributeTags] = useState<string[]>([]);
  const [customAttrInput, setCustomAttrInput] = useState("");
  const [memoBlocks, setMemoBlocks] = useState<MemoBlock[]>([]);
  const [isCreateCustomerMode, setIsCreateCustomerMode] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");

  const fetchCustomers = useCallback(async (targetUserId: string) => {
    setIsCustomersLoading(true);
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
    } catch (error) {
      console.error("fetchCustomers Error:", error);
      setCustomerData([]);
    } finally {
      setIsCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initAndFetchCustomers() {
      const params = new URLSearchParams(window.location.search);
      const devUser = params.get("dev_user")?.trim();

      if (devUser) {
        if (!cancelled) {
          setUserId(devUser);
          await fetchCustomers(devUser);
        }
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const profileUserId = profile.userId;

        if (!cancelled) {
          setUserId(profileUserId);
          await fetchCustomers(profileUserId);
        }
      } catch (error) {
        console.error("LIFF init Error:", error);
        if (!cancelled) {
          setUserId(DEFAULT_USER_ID);
          await fetchCustomers(DEFAULT_USER_ID);
        }
      }
    }

    initAndFetchCustomers();

    return () => {
      cancelled = true;
    };
  }, [fetchCustomers]);

  useEffect(() => {
    const savedBusinessType = localStorage.getItem("businessType") as BusinessType | null;
    const savedIconTheme = localStorage.getItem("iconTheme") as IconTheme | null;
    if (savedBusinessType && ["cabaret", "fuzoku", "host"].includes(savedBusinessType)) {
      setSelectedBusinessType(savedBusinessType);
    }
    if (savedIconTheme && ["glass", "jewel", "perfume", "moon_star", "flower", "teacup", "symbol"].includes(savedIconTheme)) {
      setIconTheme(savedIconTheme);
    }
    setIsCompactMode(localStorage.getItem("isCompactMode") === "true");
  }, []);

  const targetDummyTag = getTargetDummyTag(selectedBusinessType);
  const baseVisibleCustomers = customerData.filter((customer) => {
    if (customer.tagsArray.includes("非表示")) return false;
    if (customer.tagsArray.includes("ダミー") && !customer.tagsArray.includes(targetDummyTag)) return false;
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
  const selectedCustomer = selectedCustomerId
    ? customerData.find((customer) => customer.id === selectedCustomerId) || null
    : null;
  const moodTags = INDUSTRY_MOOD_CONFIGS[selectedBusinessType] || INDUSTRY_MOOD_CONFIGS.cabaret;
  const factTags = INDUSTRY_FACT_CONFIGS[selectedBusinessType] || INDUSTRY_FACT_CONFIGS.cabaret;
  const editAttributeOptions = Array.from(new Set([
    ...(INDUSTRY_ATTRIBUTE_TAGS[selectedBusinessType] || INDUSTRY_ATTRIBUTE_TAGS.cabaret),
    ...(selectedCustomer?.tagsArray || []),
    ...editAttributeTags,
  ])).filter((tag) => tag !== "ダミー" && tag !== "非表示" && tag !== "一軍固定");

  function closeModal() {
    setActiveModal(null);
    setExpandedPhotoUrl("");
  }

  function showNotice(message: string) {
    window.alert(message);
  }

  function selectCustomer(customer: Customer) {
    const isSameCustomer = selectedCustomerId === customer.id && nameInputValue === customer.name;

    if (isSameCustomer) {
      setSelectedCustomerId(null);
      setNameInputValue("");
      setVisitStatus("yes");
      return;
    }

    setSelectedCustomerId(customer.id);
    setNameInputValue(customer.name);
    setCreateMode("text");
    setVisitStatus("yes");
    setActiveTab("create");
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

  function openEditCustomer(customer: Customer) {
    const memos = getPastMemos(customer);
    setIsCreateCustomerMode(false);
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
    setCurrentListFilter((current) => current === filterType && filterType !== "all" ? "all" : filterType);
  }

  function setBusinessType(value: BusinessType) {
    setSelectedBusinessType(value);
    localStorage.setItem("businessType", value);
  }

  function setSelectedIconTheme(value: IconTheme) {
    setIconTheme(value);
    localStorage.setItem("iconTheme", value);
  }

  function toggleCompactMode() {
    setIsCompactMode((current) => {
      localStorage.setItem("isCompactMode", String(!current));
      return !current;
    });
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

  async function saveCustomerEdit() {
    const newName = editCustomerName.trim();
    if (!newName) {
      showNotice("名前を入力してください");
      return;
    }

    try {
      let customerId = selectedCustomerId;
      if (isCreateCustomerMode) {
        const res = await fetch("/api/customers/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, newName, newTags: editAttributeTags }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "顧客作成に失敗しました");
        customerId = data.customer?.id || null;
      } else {
        const res = await fetch("/api/customers/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, customerId: selectedCustomerId, newName, newTags: editAttributeTags }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "顧客更新に失敗しました");
      }

      if (customerId) {
        await fetch("/api/entries/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            customerId,
            entries: memoBlocks.map((block) => ({
              id: block.entryId || null,
              date: block.date,
              text: block.text,
              tags: block.tags,
              photoUrl: block.photoUrl || null,
              type: block.type,
            })),
            deletedEntryIds: [],
          }),
        });
      }

      await fetchCustomers(userId);
      closeModal();
    } catch (error) {
      console.error("saveCustomerEdit Error:", error);
      showNotice(error instanceof Error ? error.message : "保存に失敗しました");
    }
  }

  return (
    <>
<div id="actionToast" data-current-user-id={userId}>完了しました</div>

  <div id="cuteToast">
    <span id="cuteToastIcon" style={{fontSize: "16px", display: "inline-block"}}>🐰</span>
    <span id="cuteToastText">執筆中だよ...</span>
  </div>

      <input type="radio" name="nav" id="nav-create" className="ui-state" checked={activeTab === "create"} onChange={() => setActiveTab("create")} />
      <input type="radio" name="nav" id="nav-data" className="ui-state" checked={activeTab === "data"} onChange={() => setActiveTab("data")} />
      <input type="radio" name="nav" id="nav-settings" className="ui-state" checked={activeTab === "settings"} onChange={() => setActiveTab("settings")} />
  
      <input type="radio" name="mode" id="mode-text" className="ui-state" checked={createMode === "text"} onChange={() => setCreateMode("text")} />
      <input type="radio" name="mode" id="mode-photo" className="ui-state" checked={createMode === "photo"} onChange={() => setCreateMode("photo")} />
  
      <input type="radio" name="visit" id="visit-yes" className="ui-state" checked={visitStatus === "yes"} onChange={() => setVisitStatus("yes")} />
      <input type="radio" name="visit" id="visit-no" className="ui-state" checked={visitStatus === "no"} onChange={() => setVisitStatus("no")} />
  
      <input type="radio" name="style" id="style-cute" className="ui-state" checked={styleTab === "cute"} onChange={() => setStyleTab("cute")} />
      <input type="radio" name="style" id="style-custom" className="ui-state" checked={styleTab === "custom"} onChange={() => setStyleTab("custom")} />
      <input type="radio" name="style" id="style-neat" className="ui-state" checked={styleTab === "neat"} onChange={() => setStyleTab("neat")} />

  <div id="photoModal" className="modal-overlay" style={{zIndex: "10008", display: activeModal === "photo" ? "flex" : "none"}} data-original-click={"closePhotoModal(event)"} onClick={closeModal}>
    <div style={{position: "relative", maxWidth: "90%", maxHeight: "90%", margin: "auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}} data-original-click={"event.stopPropagation()"} onClick={(event) => event.stopPropagation()}>
      <img id="expandedPhoto" src={expandedPhotoUrl} style={{width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)"}} />
      <div data-original-click={"closePhotoModal(event)"} onClick={closeModal} style={{position: "absolute", top: "-12px", right: "-12px", background: "#FFF", width: "32px", height: "32px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "16px", color: "var(--text-main)", cursor: "pointer", boxShadow: "var(--shadow-sm)"}}>×</div>
    </div>
  </div>

  <div id="cardActionModalBackdrop" className="half-modal-backdrop" data-original-click={"closeCardActionModal()"}></div>
  <div id="cardActionHalfModal" className="half-modal" style={{zIndex: "10002"}}>
    <div className="half-modal-handle"></div>
    <h3 id="actionModalName" style={{margin: "0 0 16px", fontWeight: "700", textAlign: "center", color: "var(--text-main)"}}></h3>
    <button id="btnToggleVip" data-original-click={"toggleVipPin()"} style={{width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "14px", marginBottom: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "var(--shadow-sm)"}}></button>
    <button data-original-click={"setHidden()"} style={{width: "100%", background: "var(--alert-bg)", color: "var(--alert-text)", border: "1px solid transparent", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "14px", marginBottom: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"}}>💤 非表示にする</button>
  </div>

  <div id="createDetailsBackdrop" className="half-modal-backdrop" data-original-click={"closeCreateDetailsModal()"} onClick={() => setIsCreateDetailsOpen(false)}></div>
  <div id="createDetailsHalfModal" className={`half-modal create-details-half-modal ${isCreateDetailsOpen ? "open" : ""}`} style={{height: isCreateDetailsOpen ? "320px" : undefined}}>
    <div className="half-modal-handle" data-original-click={"closeCreateDetailsModal()"} role="button" tabIndex={0} onClick={() => setIsCreateDetailsOpen(false)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setIsCreateDetailsOpen(false); } }} data-original-keydown={"if(event.key==='Enter'||event.key===' '){ event.preventDefault(); closeCreateDetailsModal(); }"}></div>
    <div className="create-details-modal-header">
      <span className="label" style={{margin: "0"}}>📝 詳細を追加</span>
      <button type="button" className="create-details-modal-close" data-original-click={"closeCreateDetailsModal()"} onClick={() => setIsCreateDetailsOpen(false)} aria-label="閉じる">×</button>
    </div>
    <div id="createDetailsContent" className="create-details-modal-scroll">
      {/* 感情タグ */}
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"}}>
        <span className="label" style={{margin: "0"}}>🎭 感情・ムード</span>
        <div style={{display: "flex", gap: "6px"}}>
          <button type="button" data-original-click={"loadMoodPreset()"} style={{background: "var(--input-bg)", border: "none", color: "var(--text-sub)", fontSize: "10px", padding: "4px 8px", borderRadius: "8px", fontWeight: "700", cursor: "pointer"}}>プリセット読込</button>
          <button type="button" data-original-click={"saveMoodPreset()"} style={{background: "var(--primary-light)", border: "none", color: "var(--primary)", fontSize: "10px", padding: "4px 8px", borderRadius: "8px", fontWeight: "700", cursor: "pointer"}}>保存</button>
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
        <textarea id="todayEpisodeInput" className="input-field" placeholder="（例）こけてみんなで爆笑した！ウザ絡みされたけどシャンパン入れてくれた笑&#10;※AIが空気を読んで綺麗なメッセージにします✨" data-original-input={"autoScrollTextarea()"} style={{background: "var(--input-bg)", border: "1px solid transparent"}}></textarea>
        <div className="clear-btn" data-original-click={"clearEpisodeInput()"}>🧹 クリア</div>
      </div>
    </div>
  </div>

  <div id="hiddenListModal" className="modal-overlay" style={{zIndex: "10005", display: activeModal === "hidden" ? "flex" : "none"}} onClick={closeModal}>
    <div className="modal-content" style={{maxHeight: "85vh", display: "flex", flexDirection: "column"}} onClick={(event) => event.stopPropagation()}>
      <h2 style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}}>💤 非表示にした顧客</h2>
      <p style={{textAlign: "center", fontSize: "11px", color: "var(--text-sub)", marginTop: "-10px", marginBottom: "16px", fontWeight: "700"}}>カードを長押しして記録を確認</p>
      <div id="hiddenCustomersArea" style={{overflowY: "auto", flex: "1", paddingBottom: "20px", margin: "-10px"}}></div>
      <button data-original-click={"closeHiddenListModal()"} onClick={closeModal} style={{width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", marginTop: "20px"}}>閉じる</button>
    </div>
  </div>

  <div id="setupModal" className="modal-overlay">
    <div className="modal-content" style={{textAlign: "center"}}>
      <h2 id="setup-title" style={{margin: "0 0 10px", fontWeight: "700"}}></h2>
      <p id="setup-desc" style={{color: "var(--text-sub)", fontSize: "13px", fontWeight: "700", marginBottom: "24px"}}></p>
      <select id="initialBusinessType" className="input-field" style={{marginBottom: "24px", fontWeight: "700", textAlign: "center", background: "#FFF", border: "1px solid var(--border-color)"}}>
        <option value="cabaret">キャバクラ・ラウンジ</option>
        <option value="fuzoku">風俗・メンエス</option>
        <option value="host">ホストクラブ</option>
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
          <div id="text-style-cute" className="style-desc-box"></div>
        </div>
        <div className="style-desc-custom">
          <div id="text-style-custom" className="style-desc-box"></div>
          <textarea id="customStyleText" className="input-field" style={{height: "100px", marginBottom: "16px", fontSize: "13px", background: "#FFF", border: "1px solid var(--border-color)"}} data-original-change={"saveStyleSettings()"}></textarea>
          <div style={{display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "6px"}}><span>テンション（低）</span><span>（高）</span></div>
          <input type="range" id="tensionSlider" min="1" max="5" value="3" style={{width: "100%", marginBottom: "16px"}} data-original-change={"saveStyleSettings()"} />
          <div style={{display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "6px"}}><span>絵文字の量（少）</span><span>（多）</span></div>
          <input type="range" id="emojiSlider" min="1" max="5" value="4" style={{width: "100%", marginBottom: "10px"}} data-original-change={"saveStyleSettings()"} />
        </div>
        <div className="style-desc-neat">
          <div id="text-style-neat" className="style-desc-box"></div>
        </div>
      </div>
      <button data-original-click={"closeStyleModal()"} onClick={closeModal} style={{width: "100%", background: "var(--text-main)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", marginTop: "8px"}}>設定を保存して閉じる</button>
    </div>
  </div>

  <div id="helpModal" className="modal-overlay" style={{display: activeModal === "help" ? "flex" : "none"}} onClick={closeModal}>
    <div className="modal-content help-modal-content" onClick={(event) => event.stopPropagation()}>
      <h2 id="helpModalTitle" style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}}></h2>
      <div id="helpModalBody" className="help-body"></div>
      <button data-original-click={"closeHelpModal()"} onClick={closeModal} style={{width: "100%", background: "var(--text-main)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700"}}>閉じる</button>
    </div>
  </div>

  <div id="deleteConfirmModal" className="modal-overlay" style={{zIndex: "10007"}}>
    <div className="modal-content" style={{maxWidth: "320px", textAlign: "center"}}>
      <h3 style={{margin: "0 0 10px", fontWeight: "700"}}>顧客を完全に削除しますか？</h3>
      <p style={{margin: "0 0 8px", fontSize: "12px", color: "var(--text-sub)", fontWeight: "700"}}>この操作は元に戻せません。</p>
      <p style={{margin: "0 0 20px", fontSize: "14px", color: "var(--alert-text)", fontWeight: "700"}} id="deleteTargetName"></p>
      <div style={{display: "flex", gap: "10px"}}>
        <button data-original-click={"closeDeleteConfirmModal()"} style={{flex: "1", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "12px", borderRadius: "16px", fontWeight: "700"}}>キャンセル</button>
        <button id="executeDeleteBtn" data-original-click={"executeDeleteCustomer()"} style={{flex: "1", background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", padding: "12px", borderRadius: "16px", fontWeight: "700"}}>削除する</button>
      </div>
    </div>
  </div>

  <div id="editCustomerModal" className="modal-overlay" style={{zIndex: "10006", display: activeModal === "edit" ? "flex" : "none"}} onClick={closeModal}>
    <div className="modal-content" style={{maxHeight: "85vh", overflowY: "auto"}} onClick={(event) => event.stopPropagation()}>
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
                      {factTags.map((tag) => {
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
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--border-color)"}}>
                    <button type="button" onClick={() => deleteMemoBlock(block.id)} style={{background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px"}}>🗑️</button>
                    <button type="button" onClick={() => updateMemoBlock(block.id, { isExpanded: false })} style={{background: "var(--primary-gradient)", color: "#FFF", border: "none", padding: "10px 20px", borderRadius: "20px", fontWeight: "700", fontSize: "13px", boxShadow: "var(--shadow-sm)"}}>💾 このまま保存</button>
                  </div>
                ) : null}
                <div onClick={() => updateMemoBlock(block.id, { isExpanded: false })} style={{textAlign: "center", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", marginTop: "12px", cursor: "pointer", padding: "8px 0"}}>▲ 閉じる</div>
              </div>
            </div>
          );
        })}
      </div></div>
      <div className="add-memo-btn" id="addMemoBtn" data-original-click={"addNewMemoBlock()"} onClick={addNewMemoBlock}>＋ 日付とエピソードを追加</div>

      <div id="editActionArea" style={{display: "flex", gap: "10px"}}>
        <button data-original-click={"closeEditModal()"} onClick={closeModal} style={{flex: "1", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px"}} id="cancelBtn">閉じる</button>
        <button data-original-click={"saveCustomerEdit()"} id="saveCustomerBtn" onClick={saveCustomerEdit} style={{flex: "1", background: "var(--primary)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px", boxShadow: "var(--shadow-float)"}}>保存する</button>
      </div>

      <div id="readOnlyActionArea" style={{display: "none", gap: "10px", marginTop: "16px", flexDirection: "column"}}>
        <div style={{display: "flex", gap: "10px"}}>
          <button data-original-click={"restoreHiddenFromModal()"} style={{flex: "1", background: "#F0FDF4", color: "#16A34A", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px"}}>🟢 非表示を解除</button>
          <button data-original-click={"openDeleteConfirmModal()"} style={{flex: "1", background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px"}}>🗑️ 完全に削除</button>
        </div>
        <button data-original-click={"closeEditModal()"} style={{width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px"}}>閉じる</button>
      </div>
    </div>
  </div>

  <div className="app-container">
    <header className="header-area">
      <div className="toggle-container header-toggle">
        <label htmlFor="mode-text" className="toggle-label toggle-text">💌 お礼日記</label>
        <label htmlFor="mode-photo" className="toggle-label toggle-photo">📸 写メ日記</label>
      </div>
    </header>

    <main className="scroll-area">
      <div className="page page-create">
        {/* 👤 誰に送る？ */}
        <div className="card card-customer-select">
          <span className="label">👤 誰に送る？ <span style={{fontSize: "11px", fontWeight: "normal", color: "var(--text-muted)"}}>(任意)</span></span>
          <div className="fade-scroll-wrapper">
            <div className="stories-scroll" id="quickAccessArea">
              {isCustomersLoading ? (
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

        {/* 📝 詳細を追加 */}
        <div style={{textAlign: "center", margin: "12px 0"}}>
          <div className="accordion-header" data-original-click={"toggleCreateDetails()"} id="createDetailsHeader" onClick={() => setIsCreateDetailsOpen((isOpen) => !isOpen)} style={{display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 24px", background: "#FFF", border: "1px solid var(--border-color)", borderRadius: "24px", fontSize: "13px", fontWeight: "700", color: "var(--text-main)", boxShadow: "var(--shadow-sm)", cursor: "pointer", transform: "translateY(-20px)"}}>
            📝 詳細を追加 <span style={{color: "var(--text-sub)", fontSize: "11px", fontWeight: "normal"}}>(任意)</span> <span id="createDetailsIcon">{isCreateDetailsOpen ? "▲" : "▼"}</span>
          </div>
        </div>

        <div id="inlineResultArea" className="card" style={{display: "none", border: "1px solid var(--primary-light)", background: "#FFF", marginTop: "24px", position: "relative"}}>
          <textarea id="inlineResultText" className="input-field" style={{height: "200px", lineHeight: "1.6", fontSize: "14px", marginBottom: "12px", resize: "vertical"}} placeholder="ここに生成された文章が表示されます。自由に修正できます。"></textarea>
          <input type="hidden" id="currentEntryId" value="" />
          <h3 style={{textAlign: "center", marginBottom: "6px", color: "var(--primary)", fontSize: "16px"}}>✨ 執筆完了！</h3>
          <div style={{textAlign: "center", fontSize: "11px", fontWeight: "700", color: "var(--text-sub)", marginBottom: "16px"}}>
            💡 自由に手直しOK！送信・コピー時に履歴に上書き保存されるよ✨
          </div>
          <div style={{display: "flex", gap: "10px"}}>
            <button data-original-click={"copyInlineResult()"} style={{flex: "1", background: "#FFF", color: "var(--primary)", border: "2px solid var(--primary)", padding: "12px", borderRadius: "24px", fontWeight: "700"}}>
              📋 コピー
            </button>
            <button data-original-click={"sendInlineToLine()"} style={{flex: "1", background: "var(--primary)", color: "#FFF", border: "none", padding: "12px", borderRadius: "24px", fontWeight: "700"}}>
              💬 LINE送信
            </button>
          </div>
        </div>

        {/* 💎 CTA 下部固定浮遊 */}
        <div className="sticky-submit">
          <button className="submit-btn" id="submitBtn" data-original-click={"generateDiary()"}>✨ AIで作成する</button>
        </div>

      </div>

      <div className="page page-data">
        <div id="dataStickyHeader" style={{position: "sticky", top: "-10px", zIndex: "10", margin: "-10px -16px 0", padding: "10px 16px 0"}}>
          <div style={{position: "absolute", top: "0", left: "0", width: "100%", height: "100%", background: "rgba(248, 247, 245, 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: "-1", borderBottom: "1px solid var(--border-color)"}}></div>

          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px"}}>
            <h2 style={{margin: "0", fontWeight: "700", fontSize: "18px"}}>顧客カルテ</h2>
            <div className="view-toggle" data-original-click={"toggleCompactMode()"} onClick={toggleCompactMode}><span id="viewIcon">{isCompactMode ? "📋 コンパクト" : "🗂️ 詳細表示"}</span></div>
          </div>

          <div style={{display: "flex", justifyContent: "center", marginBottom: "12px"}}>
            <div className="visit-toggle data-view-toggle" style={{maxWidth: "280px", padding: "4px"}}>
              <input type="radio" name="data-view" id="view-customer" className="ui-state" checked={dataView === "customer"} onChange={() => setDataView("customer")} />
              <input type="radio" name="data-view" id="view-history" className="ui-state" checked={dataView === "history"} onChange={() => setDataView("history")} />
              <div className="toggle-container" style={{background: "transparent", boxShadow: "none"}}>
                <label htmlFor="view-customer" className="toggle-label" style={{fontSize: "13px", zIndex: "2"}}>👥 顧客カルテ</label>
                <label htmlFor="view-history" className="toggle-label" style={{fontSize: "13px", zIndex: "2"}}>📝 生成履歴</label>
              </div>
            </div>
          </div>

          <div id="searchContainer">
            <input type="text" id="customerSearch" className="input-field" placeholder="名前、タグ、メモで検索..." data-original-input={"filterCustomerList()"} value={customerSearchText} onChange={(event) => setCustomerSearchText(event.target.value)} style={{paddingRight: "36px", background: "#FFF", border: "1px solid var(--border-color)"}} />
            <div id="clearSearchBtn" style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.05)", color: "var(--text-sub)", width: "22px", height: "22px", borderRadius: "50%", display: customerSearchText ? "flex" : "none", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", cursor: "pointer"}} data-original-click={"clearSearch()"} onClick={() => setCustomerSearchText("")}>×</div>
          </div>

          <div className="filter-container" style={{paddingBottom: "10px", marginBottom: "0"}}>
            <div className={`filter-btn ${currentListFilter === "alert" ? "active-filter" : ""}`} id="filter-btn-alert" data-original-click={"setListFilter('alert')"} onClick={() => setListFilter("alert")}>
              ⚠️ 要連絡
              <div id="alertBadge" style={{display: alertCount > 0 ? "flex" : "none", position: "absolute", top: "-6px", right: "-6px", background: "var(--alert-text)", color: "#FFF", fontSize: "9px", fontWeight: "700", minWidth: "16px", height: "16px", borderRadius: "8px", padding: "0 4px", alignItems: "center", justifyContent: "center"}}>{alertCount}</div>
            </div>
            <div className={`filter-btn ${currentListFilter === "all" ? "active-filter" : ""}`} id="filter-btn-all" data-original-click={"setListFilter('all')"} onClick={() => setListFilter("all")}>すべて</div>
            <div className={`filter-btn ${currentListFilter === "vip" ? "active-filter" : ""}`} id="filter-btn-vip" data-original-click={"setListFilter('vip')"} onClick={() => setListFilter("vip")}>💎 一軍</div>
            <div className={`filter-btn ${currentListFilter === "new" ? "active-filter" : ""}`} id="filter-btn-new" data-original-click={"setListFilter('new')"} onClick={() => setListFilter("new")}>🔰 新規</div>
            <div className={`filter-btn ${currentListFilter === "second" ? "active-filter" : ""}`} id="filter-btn-second" data-original-click={"setListFilter('second')"} onClick={() => setListFilter("second")}>✌️ 2回目</div>
            <div className={`filter-btn ${currentListFilter === "regular" ? "active-filter" : ""}`} id="filter-btn-regular" data-original-click={"setListFilter('regular')"} onClick={() => setListFilter("regular")}>👑 常連</div>
          </div>
        </div>

        <div id="customerListArea" className={isCompactMode ? "compact-view" : ""} style={{marginTop: "12px", position: "relative", zIndex: "1"}}>
          {isCustomersLoading ? (
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
              const cardClass = stats.isVip ? "card card-vip" : "card";

              return (
                <div className={cardClass} key={customer.id || customer.name}>
                  <div className="card-inner" style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                    <div style={{flex: "1", marginRight: "10px", overflow: "hidden", position: "relative"}}>
                      <div style={{display: "flex", alignItems: "flex-start"}}>
                        <div style={{width: "28px", height: "28px", borderRadius: "50%", flexShrink: "0", marginRight: "6px", overflow: "hidden"}} dangerouslySetInnerHTML={{__html: getAvatarSvgMarkup(customer.name, iconTheme)}}></div>
                        {sysBadge ? <span style={{background: "var(--input-bg)", color: "var(--text-sub)", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", border: "1px solid transparent", marginRight: "6px", display: "inline-block", flexShrink: "0", whiteSpace: "nowrap", height: "fit-content"}}>{sysBadge}</span> : null}
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
                      <button type="button" className="action-btn" onClick={(event) => { event.stopPropagation(); selectCustomer(customer); }} style={{background: "var(--primary-light)", color: "var(--primary)", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", transition: "0.2s"}}><span className="action-icon" style={{fontSize: "14px"}}>✏️</span><span className="action-text">日記作成</span></button>
                      <button type="button" className="action-btn" onClick={(event) => { event.stopPropagation(); openEditCustomer(customer); }} style={{background: "var(--input-bg)", color: "var(--text-sub)", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", transition: "0.2s"}}><span className="action-icon" style={{fontSize: "14px"}}>⚙️</span><span className="action-text">編集</span></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div id="historyListArea" style={{display: "none", marginTop: "12px", position: "relative", zIndex: "1"}}></div>
        <div className="fab" role="button" tabIndex={0} data-original-click={"openCreateModal()"} onClick={openCreateCustomerModal} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCreateCustomerModal(); } }} data-original-keydown={"if(event.key==='Enter'||event.key===' '){ event.preventDefault(); openCreateModal(); }"}>＋</div>
      </div>

      <div className="page page-settings" style={{position: "relative"}}>
        <h2 style={{margin: "0 0 16px", fontWeight: "700", fontSize: "18px"}}>設定・情報</h2>

        <div className="card" style={{marginBottom: "24px"}}>
          <div className="setting-item" style={{borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "16px"}} data-original-click={"openStyleModal()"} onClick={() => setActiveModal("style")}>
            <span>🎨 AIスタイル・口調設定</span>
            <span className="settings-val" id="styleOverviewText">かわいい・清楚・カスタム</span>
          </div>
          <div className="setting-item" style={{borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "16px"}}>
            <span>🏢 業態設定</span>
            <select className="input-field" id="businessType" data-original-change={"updateChipsAndSave()"} value={selectedBusinessType} onChange={(event) => setBusinessType(event.target.value as BusinessType)} style={{width: "140px", padding: "6px", fontWeight: "700", textAlign: "right", border: "none", background: "transparent"}}>
              <option value="cabaret">キャバクラ</option>
              <option value="fuzoku">風俗・メンエス</option>
              <option value="host">ホスト</option>
            </select>
          </div>
          <div className="setting-item">
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"}}>
              <h3 className="section-title" style={{margin: "0"}}>🎨 アイコンテーマ</h3>
            </div>
            <select id="icon-theme-select" className="input-field" value={iconTheme} onChange={(event) => setSelectedIconTheme(event.target.value as IconTheme)} style={{width: "100%"}}>
              <option value="glass">🥂 グラス</option>
              <option value="jewel">💎 ジュエル</option>
              <option value="perfume">🧴 パフューム</option>
              <option value="moon_star">🌙 ムーン＆スター</option>
              <option value="flower">🌹 フラワー</option>
              <option value="teacup">☕ ティーカップ</option>
              <option value="symbol">♠️ カラーサークル</option>
            </select>
          </div>
        </div>

        <div className="card" style={{padding: "16px 20px"}}>
          <div style={{color: "var(--alert-text)", fontWeight: "700", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px"}}>🚨 放置アラート設定（日数）</div>
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
        <label htmlFor="nav-create" className="nav-item tab-create" onClick={() => setActiveTab("create")}><span style={{fontSize: "18px"}}>📝</span>作成</label>
        <label htmlFor="nav-data" className="nav-item tab-data" onClick={() => { setActiveTab("data"); setIsCreateDetailsOpen(false); }}><span style={{fontSize: "18px"}}>📖</span>顧客</label>
        <label htmlFor="nav-settings" className="nav-item tab-settings" onClick={() => { setActiveTab("settings"); setIsCreateDetailsOpen(false); }}><span style={{fontSize: "18px"}}>⚙️</span>設定</label>
      </nav>
    </footer>
  </div>
    </>
  );
}
