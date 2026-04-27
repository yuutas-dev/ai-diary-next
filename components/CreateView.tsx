"use client";

import type { ChangeEvent, FormEvent, MutableRefObject } from "react";
import { useMemo, useState } from "react";

export type CreateMode = "text" | "photo";
export type VisitStatus = "visit" | "sales";
export type DeliveryStatus = "draft" | "copied" | "line_sent" | "legacy" | "manual";

export interface CustomerEntry {
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

export interface Customer {
  id: string;
  name: string;
  memo?: string;
  tags: string;
  entries: CustomerEntry[];
}

interface CreateViewProps {
  activeFactTags: string[];
  createMode: CreateMode;
  customers: Customer[];
  editMemoBlocks: CustomerEntry[];
  episodeText: string;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  generatedText: string;
  handleCopyGenerated: () => void;
  handleGenerate: (event: FormEvent<HTMLFormElement>) => void;
  handlePhotoSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSaveEpisode: () => void;
  handleUpsertEntries: () => void;
  isDetailsOpen: boolean;
  isGenerating: boolean;
  moodTags: string[];
  onStyleSampleCreate: () => void;
  photoPreview: string | null;
  selectedCustomer: Customer | null;
  selectedCustomerTags: string[];
  setActiveFactTags: (updater: (current: string[]) => string[]) => void;
  setEditMemoBlocks: (entries: CustomerEntry[] | ((current: CustomerEntry[]) => CustomerEntry[])) => void;
  setEpisodeText: (text: string) => void;
  setGeneratedText: (text: string) => void;
  setIsDetailsOpen: (open: boolean) => void;
  setMoodTags: (updater: (current: string[]) => string[]) => void;
  setPendingDeleteEntryIds: (updater: (current: string[]) => string[]) => void;
  setPhotoPreview: (value: string | null) => void;
  setSelectedCustomerId: (id: string) => void;
  setSelectedCustomerTags: (updater: (current: string[]) => string[]) => void;
  setVisitStatus: (status: VisitStatus) => void;
  toggleListValue: (value: string, setter: (updater: (current: string[]) => string[]) => void) => void;
  visitStatus: VisitStatus;
}

const FACT_TAGS = ["同伴", "シャンパン", "延長", "指名", "場内", "イベント", "久しぶり", "初来店"];
const MOOD_TAGS = ["嬉しい", "楽しい", "感謝", "癒し", "特別感", "応援", "甘め", "大人っぽい"];
const CUSTOMER_TAGS = ["VIP", "要フォロー", "新規", "常連", "ダミー"];

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

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

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "?";
}

function getEntryText(entry: CustomerEntry) {
  return entry.text || entry.finalSentText || entry.aiGeneratedText || "";
}

export default function CreateView({
  activeFactTags,
  createMode,
  customers,
  editMemoBlocks,
  episodeText,
  fileInputRef,
  generatedText,
  handleCopyGenerated,
  handleGenerate,
  handlePhotoSelect,
  handleSaveEpisode,
  handleUpsertEntries,
  isDetailsOpen,
  isGenerating,
  moodTags,
  onStyleSampleCreate,
  photoPreview,
  selectedCustomer,
  selectedCustomerTags,
  setActiveFactTags,
  setEditMemoBlocks,
  setEpisodeText,
  setGeneratedText,
  setIsDetailsOpen,
  setMoodTags,
  setPendingDeleteEntryIds,
  setPhotoPreview,
  setSelectedCustomerId,
  setSelectedCustomerTags,
  setVisitStatus,
  toggleListValue,
  visitStatus,
}: CreateViewProps) {
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [isCustomerSuggestOpen, setIsCustomerSuggestOpen] = useState(false);

  const isPhotoMode = createMode === "photo";
  const canSubmit = isPhotoMode ? Boolean(photoPreview) : Boolean(selectedCustomer || episodeText.trim() || activeFactTags.length);
  const selectedCustomerEntries = selectedCustomer?.entries || [];

  const suggestedCustomers = useMemo(() => {
    const searchText = customerSearchText.trim().toLowerCase();
    if (!searchText) return customers.slice(0, 6);

    return customers
      .filter((customer) => {
        const tags = normalizeTags(customer.tags);
        return (
          customer.name.toLowerCase().includes(searchText) ||
          tags.some((tag) => tag.toLowerCase().includes(searchText))
        );
      })
      .slice(0, 8);
  }, [customerSearchText, customers]);

  const addMemoBlock = () => {
    setEditMemoBlocks((current) => [
      ...current,
      {
        date: todayString(),
        text: "",
        tags: [],
        type: "visit",
        status: "manual",
      },
    ]);
  };

  const deleteMemoBlock = (entry: CustomerEntry, index: number) => {
    setEditMemoBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (entry.id) {
      setPendingDeleteEntryIds((current) => [...new Set([...current, String(entry.id)])]);
    }
  };

  const updateMemoBlock = (index: number, patch: Partial<CustomerEntry>) => {
    setEditMemoBlocks((current) =>
      current.map((entry, itemIndex) => (itemIndex === index ? { ...entry, ...patch } : entry)),
    );
  };

  const toggleMemoTag = (index: number, tag: string) => {
    setEditMemoBlocks((current) =>
      current.map((entry, itemIndex) => {
        if (itemIndex !== index) return entry;
        const tags = entry.tags.includes(tag) ? entry.tags.filter((item) => item !== tag) : [...entry.tags, tag];
        return { ...entry, tags };
      }),
    );
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearchText(customer.name);
    setIsCustomerSuggestOpen(false);
  };

  return (
    <form className="page page-create" onSubmit={handleGenerate}>
      <main className="scroll-area">
        {!isPhotoMode && (
          <div className="fade-scroll-wrapper">
            <div className="stories-scroll">
              {customers.map((customer) => {
                const tags = normalizeTags(customer.tags);
                const entryCount = customer.entries.length;
                const hasAlert = tags.includes("要フォロー");

                return (
                  <button className="story-item" key={customer.id} onClick={() => selectCustomer(customer)} type="button">
                    <span className={`story-ring${tags.includes("VIP") ? " story-ring-vip" : ""}`}>
                      <span className="story-inner">{getInitial(customer.name)}</span>
                      {entryCount > 0 && <span className="story-badge">{entryCount}</span>}
                      {hasAlert && <span className="story-alert-badge">!</span>}
                    </span>
                    <span className="story-name">{customer.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isPhotoMode && (
          <section className="card card-customer-select">
            <label className="label" htmlFor="customerSearchInput">
              お客様を選択
            </label>
            <div style={{ position: "relative" }}>
              <input
                autoComplete="off"
                className="input-field"
                id="customerSearchInput"
                onBlur={() => window.setTimeout(() => setIsCustomerSuggestOpen(false), 120)}
                onChange={(event) => {
                  setCustomerSearchText(event.target.value);
                  setIsCustomerSuggestOpen(true);
                }}
                onFocus={() => setIsCustomerSuggestOpen(true)}
                placeholder="名前・タグで検索"
                value={customerSearchText || selectedCustomer?.name || ""}
              />
              <div className="result-box" style={{ display: isCustomerSuggestOpen ? "block" : undefined }}>
                {suggestedCustomers.length > 0 ? (
                  suggestedCustomers.map((customer) => (
                    <button
                      className="suggest-item"
                      key={customer.id}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectCustomer(customer);
                      }}
                      type="button"
                    >
                      {customer.name}
                      <span style={{ color: "var(--text-sub)", display: "block", fontSize: 11 }}>
                        {normalizeTags(customer.tags).join(" / ") || "タグなし"}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="suggest-item">候補がありません</div>
                )}
              </div>
            </div>

            <div className="past-memo-box" style={{ marginTop: 12 }}>
              <div id="pastMemoDisplay">
                <span className="past-memo-label">過去メモ</span>
                {selectedCustomer ? (
                  selectedCustomerEntries.length > 0 ? (
                    selectedCustomerEntries.map((entry, index) => (
                      <PastMemoItem entry={entry} key={entry.id || `${entry.date}-${index}`} />
                    ))
                  ) : (
                    <p>まだ来店メモがありません。</p>
                  )
                ) : (
                  <p>お客様を選択すると過去メモが表示されます。</p>
                )}
              </div>
            </div>
          </section>
        )}

        {isPhotoMode && (
          <section className="card mode-photo-ui">
            <label className="label">写メ日記の写真</label>
            <input accept="image/*" hidden onChange={handlePhotoSelect} ref={fileInputRef} type="file" />
            <button className="upload-area" onClick={() => fileInputRef.current?.click()} type="button">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="アップロード画像プレビュー" src={photoPreview} style={{ display: "block" }} />
              ) : null}
              <span id="uploadText">{photoPreview ? "画像を変更する" : "タップして画像を選択"}</span>
            </button>
            {photoPreview && (
              <button className="clear-btn" onClick={() => setPhotoPreview(null)} type="button">
                クリア
              </button>
            )}
          </section>
        )}

        {!isPhotoMode && (
          <section className="card mode-text-only">
            <div className="visit-toggle-hint">
              <span className={`hint-text hint-yes${visitStatus === "visit" ? " active-filter" : ""}`}>
                来店のお礼・接客メモをもとに作成
              </span>
              <span className={`hint-text hint-no${visitStatus === "sales" ? " active-filter" : ""}`}>
                営業LINE向けに作成
              </span>
            </div>
            <div className="toggle-container visit-toggle">
              <button className="toggle-label visit-label-yes" onClick={() => setVisitStatus("visit")} type="button">
                来店
              </button>
              <button className="toggle-label visit-label-no" onClick={() => setVisitStatus("sales")} type="button">
                営業
              </button>
            </div>
          </section>
        )}

        {!isPhotoMode && (
          <TagSection
            activeValues={selectedCustomerTags}
            className="selected-mood-chip"
            label="属性タグ"
            onToggle={(tag) => toggleListValue(tag, setSelectedCustomerTags)}
            tags={CUSTOMER_TAGS}
          />
        )}

        <TagSection
          activeValues={activeFactTags}
          className="selected-fact-chip"
          label={isPhotoMode ? "写真の事実タグ" : "今日の事実タグ"}
          onToggle={(tag) => toggleListValue(tag, setActiveFactTags)}
          tags={FACT_TAGS}
        />

        {!isPhotoMode && (
          <TagSection
            activeValues={moodTags}
            className="selected-mood-chip"
            label="感情タグ"
            onToggle={(tag) => toggleListValue(tag, setMoodTags)}
            tags={MOOD_TAGS}
          />
        )}

        <section className="card">
          <label className="label" htmlFor="episodeText">
            {isPhotoMode ? "写真に添えたい雰囲気・補足" : "今日の出来事"}
          </label>
          <div className="textarea-wrapper">
            <textarea
              className="input-field"
              id="episodeText"
              onChange={(event) => setEpisodeText(event.target.value)}
              placeholder={
                isPhotoMode
                  ? "写真のシチュエーション、衣装、伝えたい雰囲気など"
                  : "会話内容、印象に残ったこと、次に触れたい話題など"
              }
              value={episodeText}
            />
            {episodeText && (
              <button className="clear-btn" onClick={() => setEpisodeText("")} type="button">
                消す
              </button>
            )}
          </div>
        </section>

        {!isPhotoMode && (
          <section className="card">
            <button className="accordion-header" onClick={() => setIsDetailsOpen(!isDetailsOpen)} type="button">
              接客メモを編集 <span>{isDetailsOpen ? "閉じる" : "開く"}</span>
            </button>
            <div className={`accordion-content${isDetailsOpen ? " open" : ""}`}>
              <MemoBlocksEditor
                addMemoBlock={addMemoBlock}
                deleteMemoBlock={deleteMemoBlock}
                editMemoBlocks={editMemoBlocks}
                onSave={handleUpsertEntries}
                toggleMemoTag={toggleMemoTag}
                updateMemoBlock={updateMemoBlock}
              />
            </div>
          </section>
        )}

        {generatedText && (
          <section className="card">
            <label className="label" htmlFor="inlineResultText">
              生成結果
            </label>
            <textarea
              className="input-field"
              id="inlineResultText"
              onChange={(event) => setGeneratedText(event.target.value)}
              style={{ height: 220 }}
              value={generatedText}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="submit-btn" onClick={handleCopyGenerated} type="button">
                コピー
              </button>
              <button className="filter-btn" onClick={onStyleSampleCreate} type="button">
                文体に追加
              </button>
            </div>
            {!isPhotoMode && visitStatus === "visit" && (
              <button className="filter-btn" onClick={handleSaveEpisode} style={{ marginTop: 10 }} type="button">
                来店エピソードとして保存
              </button>
            )}
          </section>
        )}
      </main>

      <div className="sticky-submit">
        <button className="submit-btn" disabled={isGenerating || !canSubmit} type="submit">
          {isGenerating ? "生成中..." : isPhotoMode ? "写メ日記を生成" : "お礼日記を生成"}
        </button>
      </div>
    </form>
  );
}

function PastMemoItem({ entry }: { entry: CustomerEntry }) {
  const tags = normalizeTags(entry.tags);
  const text = getEntryText(entry);

  return (
    <div style={{ borderBottom: "1px dashed var(--border-color)", marginBottom: 10, paddingBottom: 10 }}>
      <strong>{entry.date}</strong>
      {entry.type && (
        <span style={{ color: "var(--text-sub)", fontSize: 11, marginLeft: 8 }}>
          {entry.type === "visit" ? "来店" : "営業"}
        </span>
      )}
      <p style={{ margin: "4px 0 6px", whiteSpace: "pre-wrap" }}>{text || "メモなし"}</p>
      {tags.length > 0 && (
        <div className="tags-scroll-container" style={{ paddingBottom: 0 }}>
          {tags.map((tag) => (
            <span className="attr-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TagSection({
  activeValues,
  className,
  label,
  onToggle,
  tags,
}: {
  activeValues: string[];
  className: string;
  label: string;
  onToggle: (tag: string) => void;
  tags: string[];
}) {
  return (
    <section className="card">
      <span className="label">{label}</span>
      <div className="tags-scroll-container">
        {tags.map((tag) => (
          <button
            className={`chip${activeValues.includes(tag) ? ` ${className}` : ""}`}
            key={tag}
            onClick={() => onToggle(tag)}
            type="button"
          >
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}

function MemoBlocksEditor({
  addMemoBlock,
  deleteMemoBlock,
  editMemoBlocks,
  onSave,
  toggleMemoTag,
  updateMemoBlock,
}: {
  addMemoBlock: () => void;
  deleteMemoBlock: (entry: CustomerEntry, index: number) => void;
  editMemoBlocks: CustomerEntry[];
  onSave: () => void;
  toggleMemoTag: (index: number, tag: string) => void;
  updateMemoBlock: (index: number, patch: Partial<CustomerEntry>) => void;
}) {
  return (
    <>
      <div className="memo-blocks-wrapper">
        <div id="editMemoBlocksArea">
          {editMemoBlocks.length > 0 ? (
            editMemoBlocks.map((entry, index) => (
              <div className={`memo-block${entry.text ? " expanded" : ""}`} key={entry.id || index}>
                <input
                  className="memo-date"
                  onChange={(event) => updateMemoBlock(index, { date: event.target.value })}
                  type="date"
                  value={entry.date || todayString()}
                />
                <textarea
                  className="memo-text"
                  onChange={(event) => updateMemoBlock(index, { text: event.target.value })}
                  placeholder="接客メモを入力"
                  value={entry.text || ""}
                />
                <div className="memo-tag-dropdown">
                  <div className="tags-scroll-container" style={{ paddingTop: 8 }}>
                    {FACT_TAGS.map((tag) => (
                      <button
                        className={`chip${entry.tags.includes(tag) ? " selected-fact-chip" : ""}`}
                        key={tag}
                        onClick={() => toggleMemoTag(index, tag)}
                        type="button"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="clear-btn" onClick={() => deleteMemoBlock(entry, index)} type="button">
                  削除
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-sub)", fontSize: 13, margin: "12px 0" }}>
              まだ接客メモがありません。必要に応じて追加してください。
            </p>
          )}
        </div>
      </div>
      <button className="add-memo-btn" onClick={addMemoBlock} type="button">
        ＋ メモを追加
      </button>
      <button className="submit-btn" onClick={onSave} type="button">
        メモを保存
      </button>
    </>
  );
}
