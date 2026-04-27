"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreateView from "@/components/CreateView";

type TabKey = "create" | "data" | "settings";
type CreateMode = "text" | "photo";
type VisitStatus = "visit" | "sales";
type DataViewMode = "customers" | "history";
type ListFilter = "all" | "vip" | "alert" | "dummy";
type StyleKey = "cute" | "custom" | "neat";
type DeliveryStatus = "draft" | "copied" | "line_sent" | "legacy" | "manual";

interface CustomerEntry {
  id?: string | null;
  date: string;
  text: string;
  aiGeneratedText?: string;
  finalSentText?: string;
  tags: string[];
  photoUrl?: string | null;
  type?: VisitStatus;
  status?: DeliveryStatus;
}

interface Customer {
  id: string;
  name: string;
  memo?: string;
  tags: string;
  entries: CustomerEntry[];
}

interface HistoryItem {
  entryId: string;
  customerId: string | null;
  customerName: string;
  entryType: VisitStatus;
  entryDate: string;
  deliveryStatus: DeliveryStatus;
  aiGeneratedText: string;
  finalSentText: string;
  isFavorited: boolean;
}

interface AppSettings {
  businessType: string;
  style: StyleKey;
  tension: string;
  emoji: string;
  customText: string;
  autoSaveEpisode: boolean;
  useFavoriteSamples: boolean;
}

interface ToastState {
  message: string;
  visible: boolean;
}

const FACT_TAGS = ["同伴", "シャンパン", "延長", "指名", "場内", "イベント", "久しぶり", "初来店"];
const MOOD_TAGS = ["嬉しい", "楽しい", "感謝", "癒し", "特別感", "応援", "甘め", "大人っぽい"];
const CUSTOMER_TAGS = ["VIP", "要フォロー", "新規", "常連", "ダミー"];
const STORAGE_KEY = "ai-diary-next-settings";
const DEFAULT_USER_ID = "test-user";

const DEFAULT_SETTINGS: AppSettings = {
  businessType: "cabaret",
  style: "cute",
  tension: "3",
  emoji: "4",
  customText: "",
  autoSaveEpisode: true,
  useFavoriteSamples: true,
};

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string" && tags.trim()) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function parseEntries(customer: Partial<Customer>): CustomerEntry[] {
  if (Array.isArray(customer.entries)) {
    return customer.entries.map((entry) => ({
      ...entry,
      tags: normalizeTags(entry.tags),
      type: entry.type === "sales" ? "sales" : "visit",
    }));
  }

  if (!customer.memo) return [];

  try {
    const parsed = JSON.parse(customer.memo);
    return Array.isArray(parsed)
      ? parsed.map((entry) => ({
          ...entry,
          tags: normalizeTags(entry.tags),
          type: entry.type === "sales" ? "sales" : "visit",
        }))
      : [];
  } catch {
    return [];
  }
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(json?.error || `API request failed: ${path}`);
  }

  return json;
}

function AppRadios({
  activeTab,
  createMode,
  visitStatus,
}: {
  activeTab: TabKey;
  createMode: CreateMode;
  visitStatus: VisitStatus;
}) {
  return (
    <>
      <input className="ui-state" id="nav-create" readOnly type="radio" checked={activeTab === "create"} />
      <input className="ui-state" id="nav-data" readOnly type="radio" checked={activeTab === "data"} />
      <input className="ui-state" id="nav-settings" readOnly type="radio" checked={activeTab === "settings"} />
      <input className="ui-state" id="mode-text" readOnly type="radio" checked={createMode === "text"} />
      <input className="ui-state" id="mode-photo" readOnly type="radio" checked={createMode === "photo"} />
      <input className="ui-state" id="visit-yes" readOnly type="radio" checked={visitStatus === "visit"} />
      <input className="ui-state" id="visit-no" readOnly type="radio" checked={visitStatus === "sales"} />
    </>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("create");
  const [createMode, setCreateMode] = useState<CreateMode>("text");
  const [visitStatus, setVisitStatus] = useState<VisitStatus>("visit");
  const [dataViewMode, setDataViewMode] = useState<DataViewMode>("customers");

  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [liffDisplayName, setLiffDisplayName] = useState("");

  const [customerData, setCustomerData] = useState<Customer[]>([]);
  const [favoriteEntryIds, setFavoriteEntryIds] = useState<string[]>([]);
  const [favoriteTexts, setFavoriteTexts] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [currentListFilter, setCurrentListFilter] = useState<ListFilter>("all");
  const [isCompactView, setIsCompactView] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingCustomerName, setEditingCustomerName] = useState("");
  const [editingCustomerTags, setEditingCustomerTags] = useState<string[]>([]);

  const [episodeText, setEpisodeText] = useState("");
  const [activeFactTags, setActiveFactTags] = useState<string[]>([]);
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([]);
  const [selectedCustomerTags, setSelectedCustomerTags] = useState<string[]>([]);
  const [pendingDeleteEntryIds, setPendingDeleteEntryIds] = useState<string[]>([]);
  const [editMemoBlocks, setEditMemoBlocks] = useState<CustomerEntry[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [generatedEntryId, setGeneratedEntryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(() => setToast((current) => ({ ...current, visible: false })), 2200);
  }, []);

  const fetchCustomers = useCallback(
    async (targetUserId = userId) => {
      setIsCustomersLoading(true);
      try {
        const json = await postJson<{
          success: boolean;
          customers?: Customer[];
          favoriteIds?: string[];
          favoriteTexts?: string[];
          error?: string;
        }>("/api/customers/list", { userId: targetUserId });

        if (!json.success) throw new Error(json.error || "顧客データの取得に失敗しました");

        const normalizedCustomers = (json.customers || []).map((customer) => ({
          ...customer,
          tags: customer.tags || "",
          entries: parseEntries(customer),
        }));

        setCustomerData(normalizedCustomers);
        setFavoriteEntryIds((json.favoriteIds || []).map(String));
        setFavoriteTexts((json.favoriteTexts || []).filter(Boolean));
        setSelectedCustomerId((current) => current || normalizedCustomers[0]?.id || "");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "顧客データの取得に失敗しました");
      } finally {
        setIsCustomersLoading(false);
      }
    },
    [showToast, userId],
  );

  const fetchHistory = useCallback(
    async (targetUserId = userId, customerId?: string | null) => {
      setIsHistoryLoading(true);
      try {
        const json = await postJson<{ success: boolean; items?: HistoryItem[]; error?: string }>(
          "/api/entries/history",
          {
            userId: targetUserId,
            customerId: customerId || null,
          },
        );

        if (!json.success) throw new Error(json.error || "履歴の取得に失敗しました");
        setHistoryItems(json.items || []);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "履歴の取得に失敗しました");
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [showToast, userId],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devUser = params.get("dev_user")?.trim();
    const nextUserId = devUser || DEFAULT_USER_ID;

    const savedSettings = window.localStorage.getItem(STORAGE_KEY);
    queueMicrotask(() => {
      setUserId(nextUserId);
      setIsDevMode(Boolean(devUser));

      if (savedSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    });

    let cancelled = false;

    async function initLiff() {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId || devUser) {
          if (!cancelled) setIsLiffReady(true);
          return;
        }

        const liffModule = (await import("@line/liff")).default;
        await liffModule.init({ liffId });

        if (!liffModule.isLoggedIn()) {
          liffModule.login();
          return;
        }

        const profile = await liffModule.getProfile();
        if (!cancelled) {
          setUserId(profile.userId || nextUserId);
          setLiffDisplayName(profile.displayName || "");
          setIsLiffReady(true);
        }
      } catch {
        if (!cancelled) setIsLiffReady(true);
      }
    }

    initLiff();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!isLiffReady || !userId) return;
    void Promise.resolve().then(() => {
      fetchCustomers(userId);
      fetchHistory(userId);
    });
  }, [fetchCustomers, fetchHistory, isLiffReady, userId]);

  const selectedCustomer = useMemo(
    () => customerData.find((customer) => customer.id === selectedCustomerId) || null,
    [customerData, selectedCustomerId],
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (!selectedCustomer) {
        setEditMemoBlocks([]);
        setSelectedCustomerTags([]);
        setPendingDeleteEntryIds([]);
        return;
      }

      setEditMemoBlocks(selectedCustomer.entries || []);
      setSelectedCustomerTags(normalizeTags(selectedCustomer.tags));
      setPendingDeleteEntryIds([]);
    });
  }, [selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    const searchText = customerSearchText.trim().toLowerCase();

    return customerData.filter((customer) => {
      const tags = normalizeTags(customer.tags);
      const matchesSearch =
        !searchText ||
        customer.name.toLowerCase().includes(searchText) ||
        tags.some((tag) => tag.toLowerCase().includes(searchText));

      const matchesFilter =
        currentListFilter === "all" ||
        (currentListFilter === "vip" && tags.includes("VIP")) ||
        (currentListFilter === "alert" && tags.includes("要フォロー")) ||
        (currentListFilter === "dummy" && tags.includes("ダミー"));

      return matchesSearch && matchesFilter;
    });
  }, [customerData, customerSearchText, currentListFilter]);

  const generationPayload = useMemo(
    () => ({
      userId,
      mode: createMode,
      visitStatus,
      name: selectedCustomer?.name || "",
      customerId: selectedCustomer?.id || "",
      episodeText,
      factTags: activeFactTags,
      moodTags: selectedMoodTags,
      customerTags: selectedCustomerTags,
      customerRank: selectedCustomerTags.includes("VIP") ? "VIP" : "新規",
      pastMemo: editMemoBlocks.map((entry) => `${entry.date}: ${entry.text}`).join("\n"),
      style: settings.style,
      tension: settings.tension,
      emoji: settings.emoji,
      customText: settings.customText,
      businessType: settings.businessType,
      image: photoPreview,
      favoriteTexts: settings.useFavoriteSamples ? favoriteTexts : [],
    }),
    [
      activeFactTags,
      createMode,
      editMemoBlocks,
      episodeText,
      favoriteTexts,
      photoPreview,
      selectedCustomer,
      selectedCustomerTags,
      selectedMoodTags,
      settings,
      userId,
      visitStatus,
    ],
  );

  const toggleListValue = (value: string, setter: (updater: (current: string[]) => string[]) => void) => {
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    setIsGenerating(true);

    try {
      const json = await postJson<{ success: boolean; generatedText?: string; entry_id?: string | null; error?: string }>(
        "/api/generate",
        generationPayload,
      );

      if (!json.success) throw new Error(json.error || "生成に失敗しました");
      setGeneratedText(json.generatedText || "");
      setGeneratedEntryId(json.entry_id || null);
      showToast("生成しました");
      await fetchCustomers(userId);
      await fetchHistory(userId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompleteEntry = async (deliveryStatus: "copied" | "line_sent") => {
    if (!generatedEntryId || !generatedText.trim()) return;

    await postJson("/api/entries/complete", {
      userId,
      entryId: generatedEntryId,
      finalSentText: generatedText,
      deliveryStatus,
    });
    showToast(deliveryStatus === "line_sent" ? "送信済みにしました" : "コピー済みにしました");
    await fetchHistory(userId);
  };

  const handleCopyGenerated = async () => {
    if (!generatedText.trim()) return;
    await navigator.clipboard.writeText(generatedText);
    await handleCompleteEntry("copied");
  };

  const handleSaveEpisode = async () => {
    if (!selectedCustomer) return;

    await postJson("/api/entries/save-episode", {
      userId,
      sourceEntryId: generatedEntryId,
      customerId: selectedCustomer.id,
      entryDate: todayString(),
      episodeText,
      factTags: activeFactTags,
    });
    showToast("エピソードを保存しました");
    await fetchCustomers(userId);
  };

  const handleUpsertEntries = async () => {
    if (!selectedCustomer) return;

    await postJson("/api/entries/upsert", {
      userId,
      customerId: selectedCustomer.id,
      entries: editMemoBlocks,
      deletedEntryIds: pendingDeleteEntryIds,
      isDevMode,
    });
    showToast("来店メモを保存しました");
    await fetchCustomers(userId);
  };

  const handleCustomerUpdate = async () => {
    if (!editingCustomerId) return;

    await postJson("/api/customers/update", {
      userId,
      customerId: editingCustomerId,
      newName: editingCustomerName,
      newTags: editingCustomerTags,
      isDevMode,
    });

    setEditingCustomerId(null);
    showToast("顧客情報を更新しました");
    await fetchCustomers(userId);
  };

  const handleFavoriteToggle = async (item: HistoryItem) => {
    const json = await postJson<{ success: boolean; isFavorited?: boolean; limitReached?: boolean; error?: string }>(
      "/api/favorites/toggle",
      {
        userId,
        entryId: item.entryId,
        customerId: item.customerId,
        customerName: item.customerName,
      },
    );

    if (!json.success) throw new Error(json.error || "お気に入り登録に失敗しました");
    if (json.limitReached) {
      showToast("お気に入りは5件までです");
      return;
    }

    setHistoryItems((items) =>
      items.map((historyItem) =>
        historyItem.entryId === item.entryId
          ? { ...historyItem, isFavorited: Boolean(json.isFavorited) }
          : historyItem,
      ),
    );
    setFavoriteEntryIds((ids) =>
      json.isFavorited ? [...new Set([...ids, item.entryId])] : ids.filter((id) => id !== item.entryId),
    );
  };

  const handleStyleSampleCreate = async () => {
    if (!generatedText.trim()) return;

    await postJson("/api/style-samples/create", {
      userId,
      text: generatedText,
      sourceType: "generated",
      sourceEntryId: generatedEntryId,
    });
    showToast("文体サンプルに追加しました");
    await fetchCustomers(userId);
  };

  return (
    <>
      <AppRadios activeTab={activeTab} createMode={createMode} visitStatus={visitStatus} />
      <div className="app-container">
        <Header activeTab={activeTab} createMode={createMode} setCreateMode={setCreateMode} />

        {activeTab === "create" && (
          <CreateView
            activeFactTags={activeFactTags}
            createMode={createMode}
            editMemoBlocks={editMemoBlocks}
            episodeText={episodeText}
            fileInputRef={fileInputRef}
            generatedText={generatedText}
            handleCopyGenerated={handleCopyGenerated}
            handleGenerate={handleGenerate}
            handlePhotoSelect={handlePhotoSelect}
            handleSaveEpisode={handleSaveEpisode}
            handleUpsertEntries={handleUpsertEntries}
            isDetailsOpen={isDetailsOpen}
            isGenerating={isGenerating}
            moodTags={selectedMoodTags}
            photoPreview={photoPreview}
            selectedCustomer={selectedCustomer}
            selectedCustomerTags={selectedCustomerTags}
            setActiveFactTags={setActiveFactTags}
            setEditMemoBlocks={setEditMemoBlocks}
            setEpisodeText={setEpisodeText}
            setGeneratedText={setGeneratedText}
            setIsDetailsOpen={setIsDetailsOpen}
            setMoodTags={setSelectedMoodTags}
            setPendingDeleteEntryIds={setPendingDeleteEntryIds}
            setPhotoPreview={setPhotoPreview}
            setSelectedCustomerId={setSelectedCustomerId}
            setSelectedCustomerTags={setSelectedCustomerTags}
            setVisitStatus={setVisitStatus}
            toggleListValue={toggleListValue}
            visitStatus={visitStatus}
            customers={customerData}
            onStyleSampleCreate={handleStyleSampleCreate}
          />
        )}

        {activeTab === "data" && (
          <DataView
            currentListFilter={currentListFilter}
            customerSearchText={customerSearchText}
            dataViewMode={dataViewMode}
            favoriteEntryIds={favoriteEntryIds}
            filteredCustomers={filteredCustomers}
            historyItems={historyItems}
            isCompactView={isCompactView}
            isCustomersLoading={isCustomersLoading}
            isHistoryLoading={isHistoryLoading}
            onCustomerEdit={(customer) => {
              setEditingCustomerId(customer.id);
              setEditingCustomerName(customer.name);
              setEditingCustomerTags(normalizeTags(customer.tags));
            }}
            onCustomerSelect={(customer) => {
              setSelectedCustomerId(customer.id);
              setActiveTab("create");
            }}
            onFavoriteToggle={handleFavoriteToggle}
            setCurrentListFilter={setCurrentListFilter}
            setCustomerSearchText={setCustomerSearchText}
            setDataViewMode={setDataViewMode}
            setIsCompactView={setIsCompactView}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            isDevMode={isDevMode}
            isLiffReady={isLiffReady}
            liffDisplayName={liffDisplayName}
            onRefresh={() => {
              fetchCustomers(userId);
              fetchHistory(userId);
            }}
            settings={settings}
            setSettings={setSettings}
            userId={userId}
          />
        )}

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <CustomerEditModal
        editingCustomerId={editingCustomerId}
        editingCustomerName={editingCustomerName}
        editingCustomerTags={editingCustomerTags}
        onClose={() => setEditingCustomerId(null)}
        onSave={handleCustomerUpdate}
        setEditingCustomerName={setEditingCustomerName}
        setEditingCustomerTags={setEditingCustomerTags}
        toggleListValue={toggleListValue}
      />

      <div id="actionToast" style={{ top: toast.visible ? 0 : undefined }}>
        {toast.message}
      </div>
    </>
  );
}

function Header({
  activeTab,
  createMode,
  setCreateMode,
}: {
  activeTab: TabKey;
  createMode: CreateMode;
  setCreateMode: (mode: CreateMode) => void;
}) {
  return (
    <header className="header-area">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700 }}>AI Diary</div>
          <h1 style={{ fontSize: 20, margin: 0 }}>営業日記アシスト</h1>
        </div>
        {activeTab === "create" && (
          <div className="toggle-container header-toggle" style={{ minWidth: 156 }}>
            <button
              className={`toggle-label toggle-text${createMode === "text" ? " active-filter" : ""}`}
              onClick={() => setCreateMode("text")}
              type="button"
            >
              テキスト
            </button>
            <button
              className={`toggle-label toggle-photo${createMode === "photo" ? " active-filter" : ""}`}
              onClick={() => setCreateMode("photo")}
              type="button"
            >
              写真
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function DataView({
  currentListFilter,
  customerSearchText,
  dataViewMode,
  favoriteEntryIds,
  filteredCustomers,
  historyItems,
  isCompactView,
  isCustomersLoading,
  isHistoryLoading,
  onCustomerEdit,
  onCustomerSelect,
  onFavoriteToggle,
  setCurrentListFilter,
  setCustomerSearchText,
  setDataViewMode,
  setIsCompactView,
}: {
  currentListFilter: ListFilter;
  customerSearchText: string;
  dataViewMode: DataViewMode;
  favoriteEntryIds: string[];
  filteredCustomers: Customer[];
  historyItems: HistoryItem[];
  isCompactView: boolean;
  isCustomersLoading: boolean;
  isHistoryLoading: boolean;
  onCustomerEdit: (customer: Customer) => void;
  onCustomerSelect: (customer: Customer) => void;
  onFavoriteToggle: (item: HistoryItem) => void;
  setCurrentListFilter: (filter: ListFilter) => void;
  setCustomerSearchText: (text: string) => void;
  setDataViewMode: (mode: DataViewMode) => void;
  setIsCompactView: (value: boolean) => void;
}) {
  return (
    <main className="page page-data">
      <div className="scroll-area">
        <section className="card data-view-toggle">
          <input className="ui-state" id="view-customer" readOnly type="radio" checked={dataViewMode === "customers"} />
          <input className="ui-state" id="view-history" readOnly type="radio" checked={dataViewMode === "history"} />
          <div className="toggle-container">
            <button className="toggle-label" onClick={() => setDataViewMode("customers")} type="button">
              顧客
            </button>
            <button className="toggle-label" onClick={() => setDataViewMode("history")} type="button">
              履歴
            </button>
          </div>
        </section>

        {dataViewMode === "customers" ? (
          <>
            <div id="searchContainer">
              <input
                className="input-field"
                onChange={(event) => setCustomerSearchText(event.target.value)}
                placeholder="名前・タグで検索"
                value={customerSearchText}
              />
            </div>
            <div className="filter-container">
              {[
                ["all", "すべて"],
                ["vip", "VIP"],
                ["alert", "要フォロー"],
                ["dummy", "ダミー"],
              ].map(([value, label]) => (
                <button
                  className={`filter-btn${currentListFilter === value ? " active-filter" : ""}`}
                  id={value === "alert" ? "filter-btn-alert" : undefined}
                  key={value}
                  onClick={() => setCurrentListFilter(value as ListFilter)}
                  type="button"
                >
                  {label}
                </button>
              ))}
              <button className="view-toggle" onClick={() => setIsCompactView(!isCompactView)} type="button">
                {isCompactView ? "詳細表示" : "コンパクト"}
              </button>
            </div>

            <div className={isCompactView ? "compact-view" : ""} id="customerListArea">
              {isCustomersLoading ? (
                <div className="skeleton" style={{ height: 120 }} />
              ) : (
                filteredCustomers.map((customer) => (
                  <CustomerCard
                    customer={customer}
                    favoriteEntryIds={favoriteEntryIds}
                    key={customer.id}
                    onEdit={onCustomerEdit}
                    onSelect={onCustomerSelect}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div>
            {isHistoryLoading ? (
              <div className="skeleton" style={{ height: 120 }} />
            ) : (
              historyItems.map((item) => (
                <HistoryCard item={item} key={item.entryId} onFavoriteToggle={onFavoriteToggle} />
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function CustomerCard({
  customer,
  favoriteEntryIds,
  onEdit,
  onSelect,
}: {
  customer: Customer;
  favoriteEntryIds: string[];
  onEdit: (customer: Customer) => void;
  onSelect: (customer: Customer) => void;
}) {
  const tags = normalizeTags(customer.tags);
  const latestEntry = customer.entries.at(-1);
  const hasFavorite = customer.entries.some((entry) => entry.id && favoriteEntryIds.includes(String(entry.id)));

  return (
    <article className={`card${tags.includes("VIP") ? " card-vip" : ""}`}>
      <div className="card-inner" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div onClick={() => onSelect(customer)} style={{ flex: 1 }}>
          <strong>{customer.name}</strong>
          <div className="card-tags" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {tags.map((tag) => (
              <span className="attr-chip" key={tag}>
                {tag}
              </span>
            ))}
            {hasFavorite && <span className="attr-chip">文体あり</span>}
          </div>
          {latestEntry && <p className="card-memo">{latestEntry.text || latestEntry.aiGeneratedText || "メモなし"}</p>}
        </div>
        <div className="card-actions" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="filter-btn action-btn" onClick={() => onSelect(customer)} type="button">
            <span className="action-icon">✎</span>
            <span className="action-text">作成</span>
          </button>
          <button className="filter-btn action-btn" onClick={() => onEdit(customer)} type="button">
            <span className="action-icon">⚙</span>
            <span className="action-text">編集</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function HistoryCard({ item, onFavoriteToggle }: { item: HistoryItem; onFavoriteToggle: (item: HistoryItem) => void }) {
  const displayText = item.finalSentText || item.aiGeneratedText;

  return (
    <article className="history-card">
      <div className="history-header">
        <div>
          <strong>{item.customerName}</strong>
          <div style={{ color: "var(--text-sub)", fontSize: 12 }}>
            {item.entryDate} / {item.entryType === "visit" ? "来店" : "営業"} / {item.deliveryStatus}
          </div>
        </div>
        <button
          className={`favorite-btn${item.isFavorited ? " active" : ""}`}
          onClick={() => onFavoriteToggle(item)}
          type="button"
        >
          ♥
        </button>
      </div>
      <p className="history-text">{displayText}</p>
    </article>
  );
}

function SettingsView({
  isDevMode,
  isLiffReady,
  liffDisplayName,
  onRefresh,
  settings,
  setSettings,
  userId,
}: {
  isDevMode: boolean;
  isLiffReady: boolean;
  liffDisplayName: string;
  onRefresh: () => void;
  settings: AppSettings;
  setSettings: (updater: AppSettings | ((current: AppSettings) => AppSettings)) => void;
  userId: string;
}) {
  return (
    <main className="page page-settings">
      <div className="scroll-area">
        <section className="settings-list">
          <div className="settings-item">
            <span>ユーザー</span>
            <span className="settings-val">{liffDisplayName || userId}</span>
          </div>
          <div className="settings-item">
            <span>LIFF</span>
            <span className="settings-val">{isLiffReady ? "Ready" : "Loading"}</span>
          </div>
          <div className="settings-item">
            <span>Dev Mode</span>
            <span className="settings-val">{isDevMode ? "ON" : "OFF"}</span>
          </div>
        </section>

        <section className="card">
          <label className="label" htmlFor="businessType">
            業態
          </label>
          <select
            className="input-field"
            id="businessType"
            onChange={(event) => setSettings((current) => ({ ...current, businessType: event.target.value }))}
            value={settings.businessType}
          >
            <option value="cabaret">キャバクラ</option>
            <option value="host">ホスト</option>
            <option value="lounge">ラウンジ</option>
          </select>
        </section>

        <section className="card">
          <span className="label">文体</span>
          <div className="style-selector">
            {[
              ["cute", "かわいい"],
              ["custom", "カスタム"],
              ["neat", "丁寧"],
            ].map(([value, label]) => (
              <button
                className="style-btn"
                key={value}
                onClick={() => setSettings((current) => ({ ...current, style: value as StyleKey }))}
                style={settings.style === value ? { background: "var(--primary)", color: "#FFF" } : undefined}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            className="input-field"
            onChange={(event) => setSettings((current) => ({ ...current, customText: event.target.value }))}
            placeholder="カスタム文体の指示"
            value={settings.customText}
          />
        </section>

        <section className="settings-list">
          <label className="settings-item">
            <span>お気に入り文体を参照</span>
            <span className="switch">
              <input
                checked={settings.useFavoriteSamples}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, useFavoriteSamples: event.target.checked }))
                }
                type="checkbox"
              />
              <span className="slider" />
            </span>
          </label>
          <label className="settings-item">
            <span>来店エピソード自動保存</span>
            <span className="switch">
              <input
                checked={settings.autoSaveEpisode}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, autoSaveEpisode: event.target.checked }))
                }
                type="checkbox"
              />
              <span className="slider" />
            </span>
          </label>
        </section>

        <button className="submit-btn" onClick={onRefresh} type="button">
          データ再取得
        </button>
      </div>
    </main>
  );
}

function CustomerEditModal({
  editingCustomerId,
  editingCustomerName,
  editingCustomerTags,
  onClose,
  onSave,
  setEditingCustomerName,
  setEditingCustomerTags,
  toggleListValue,
}: {
  editingCustomerId: string | null;
  editingCustomerName: string;
  editingCustomerTags: string[];
  onClose: () => void;
  onSave: () => void;
  setEditingCustomerName: (name: string) => void;
  setEditingCustomerTags: (updater: (current: string[]) => string[]) => void;
  toggleListValue: (value: string, setter: (updater: (current: string[]) => string[]) => void) => void;
}) {
  return (
    <div className="modal-overlay" style={{ display: editingCustomerId ? "flex" : undefined }}>
      <div className="modal-content">
        <h2 style={{ marginTop: 0 }}>顧客編集</h2>
        <label className="label" htmlFor="editingCustomerName">
          名前
        </label>
        <input
          className="input-field"
          id="editingCustomerName"
          onChange={(event) => setEditingCustomerName(event.target.value)}
          value={editingCustomerName}
        />
        <div style={{ marginTop: 16 }}>
          <span className="label">タグ</span>
          <div className="tags-scroll-container">
            {CUSTOMER_TAGS.map((tag) => (
              <button
                className={`chip${editingCustomerTags.includes(tag) ? " selected-fact-chip" : ""}`}
                key={tag}
                onClick={() => toggleListValue(tag, setEditingCustomerTags)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button className="filter-btn" onClick={onClose} type="button">
            キャンセル
          </button>
          <button className="submit-btn" onClick={onSave} type="button">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab }: { activeTab: TabKey; setActiveTab: (tab: TabKey) => void }) {
  return (
    <footer className="fixed-footer">
      <nav className="bottom-nav">
        {[
          ["create", "作成"],
          ["data", "顧客"],
          ["settings", "設定"],
        ].map(([value, label]) => (
          <button
            className={`nav-item tab-${value}`}
            key={value}
            onClick={() => setActiveTab(value as TabKey)}
            style={activeTab === value ? { color: "var(--primary)" } : undefined}
            type="button"
          >
            <span>{value === "create" ? "＋" : value === "data" ? "▣" : "⚙"}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </footer>
  );
}
