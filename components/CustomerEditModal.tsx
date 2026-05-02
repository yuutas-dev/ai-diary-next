"use client";

import type { MemoBlock } from "@/types";

export interface CustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditingHiddenCustomer: boolean;
  onOpenHiddenDeleteConfirm: () => void;
  isCreateCustomerMode: boolean;
  isEditingDummyCustomer: boolean;
  editCustomerName: string;
  onEditCustomerNameChange: (value: string) => void;
  isTagAccordionOpen: boolean;
  onTagAccordionToggle: () => void;
  editAttributeOptions: string[];
  editAttributeTags: string[];
  onToggleAttributeTag: (tag: string) => void;
  customAttrInput: string;
  onCustomAttrInputChange: (value: string) => void;
  onAddCustomAttributeTag: () => void;
  memoBlocks: MemoBlock[];
  lineFactTags: string[];
  selectedCustomerId: string | null;
  onExpandPhoto: (photoUrl: string) => void;
  updateMemoBlock: (id: string, patch: Partial<MemoBlock>) => void;
  removeMemoTag: (blockId: string, tag: string) => void;
  toggleMemoTag: (blockId: string, tag: string) => void;
  deleteMemoBlock: (id: string) => void;
  addNewMemoBlock: () => void;
  onSave: () => void;
}

export function CustomerEditModal({
  isOpen,
  onClose,
  isEditingHiddenCustomer,
  onOpenHiddenDeleteConfirm,
  isCreateCustomerMode,
  isEditingDummyCustomer,
  editCustomerName,
  onEditCustomerNameChange,
  isTagAccordionOpen,
  onTagAccordionToggle,
  editAttributeOptions,
  editAttributeTags,
  onToggleAttributeTag,
  customAttrInput,
  onCustomAttrInputChange,
  onAddCustomAttributeTag,
  memoBlocks,
  lineFactTags,
  selectedCustomerId,
  onExpandPhoto,
  updateMemoBlock,
  removeMemoTag,
  toggleMemoTag,
  deleteMemoBlock,
  addNewMemoBlock,
  onSave,
}: CustomerEditModalProps) {
  return (
    <div
      id="editCustomerModal"
      className="modal-overlay"
      style={{ zIndex: "10006", display: isOpen ? "flex" : "none" }}
      onClick={onClose}
    >
      <div className="modal-content modal-content--customer-edit" onClick={(event) => event.stopPropagation()}>
        <div className="modal-content__body">
          {isEditingHiddenCustomer ? (
            <button
              type="button"
              aria-label="完全に削除"
              onClick={onOpenHiddenDeleteConfirm}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "none",
                background: "var(--alert-bg)",
                color: "var(--alert-text)",
                fontSize: "16px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              🗑️
            </button>
          ) : null}
          <h2 style={{ margin: "0 0 20px", fontWeight: "700", textAlign: "center" }} id="modalTitle">
            {isCreateCustomerMode ? "✨ お客様とうろく" : "📝 お客様情報のへんしゅう"}
          </h2>
          <input type="hidden" id="editCustomerIndex" />
          <input type="hidden" id="isCreateMode" value={isCreateCustomerMode ? "true" : "false"} />
          <input type="hidden" id="editCustomerId" value={selectedCustomerId || ""} />

          <span className="label">名前</span>
          <input
            readOnly={isEditingDummyCustomer}
            type="text"
            id="editCustomerName"
            className="input-field"
            value={editCustomerName}
            onChange={(event) => onEditCustomerNameChange(event.target.value)}
            style={{ marginBottom: "16px", background: "#FFF", border: "1px solid var(--border-color)", opacity: isEditingDummyCustomer ? 0.92 : 1 }}
          />

          <div className="accordion-header" data-original-click={"toggleTagAccordion()"} onClick={() => { if (!isEditingDummyCustomer) onTagAccordionToggle(); }}>
            <span>🏷️ お客様のタイプ・特徴</span>
            <span id="tagAccordionIcon">{isTagAccordionOpen ? "▲" : "▼"}</span>
          </div>
          <div className={`accordion-content ${isTagAccordionOpen ? "open" : ""}`} id="tagAccordionContent">
            <div id="editAttributeTagsArea" className="overflow-y-auto" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px", maxHeight: "140px", overflowY: "auto" }}>
              {editAttributeOptions.map((tag) => {
                const isSelected = editAttributeTags.includes(tag);
                return (
                  <div
                    key={tag}
                    className={`chip${isSelected ? " active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (!isEditingDummyCustomer) onToggleAttributeTag(tag); }}
                    style={{
                      opacity: isEditingDummyCustomer ? 0.85 : undefined,
                      cursor: isEditingDummyCustomer ? "default" : "pointer",
                      background: isSelected ? "var(--primary)" : "#FFF",
                      color: isSelected ? "#FFF" : "var(--text-main)",
                      border: isSelected ? "1px solid transparent" : "1px solid var(--border-color)",
                      boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                    }}
                  >
                    {tag}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                readOnly={isEditingDummyCustomer}
                type="text"
                id="customAttrInput"
                className="input-field"
                placeholder="オリジナルタグ..."
                value={customAttrInput}
                onChange={(event) => onCustomAttrInputChange(event.target.value)}
                style={{ padding: "10px", fontSize: "12px", background: "#FFF", border: "1px solid var(--border-color)" }}
              />
              <button
                id="addAttrBtn"
                type="button"
                disabled={isEditingDummyCustomer}
                data-original-click={"addCustomAttributeTag()"}
                onClick={onAddCustomAttributeTag}
                style={{
                  background: "var(--primary)",
                  color: "#FFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0 14px",
                  fontWeight: "700",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  opacity: isEditingDummyCustomer ? 0.5 : 1,
                }}
              >
                追加
              </button>
            </div>
          </div>

          <span className="label">📝 接客メモ</span>
          <div className="memo-blocks-wrapper">
            <div id="editMemoBlocksArea">
              {memoBlocks.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: "700", padding: "20px" }}>過去の記録がありません</p>
              ) : (
                memoBlocks.map((block) => {
                  const memoReadOnly = block.isReadOnly || isEditingDummyCustomer;
                  const tagsText = block.tags.length > 0 ? block.tags.map((tag) => `#${tag}`).join(" ") : "タグなし";
                  const previewText = block.text ? block.text.split("\n")[0] : "本文なし";
                  const typeBadge = block.type === "sales" ? (
                    <span style={{ fontSize: "10px", background: "var(--sales-bg)", color: "var(--sales-text)", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", marginRight: "4px" }}>📱営業</span>
                  ) : null;
                  return (
                    <div
                      className={`memo-block${block.isExpanded ? " expanded" : ""}`}
                      id={block.id}
                      key={block.id}
                      data-entry-id={block.entryId || ""}
                      data-readonly={block.isReadOnly}
                      data-type={block.type}
                      data-status={block.status}
                      data-photo={block.photoUrl || ""}
                    >
                      <div className="memo-summary" onClick={() => updateMemoBlock(block.id, { isExpanded: true })} style={{ cursor: "pointer", display: block.isExpanded ? "none" : "block", padding: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <div className="memo-date-text" style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-sub)" }}>
                            {typeBadge}
                            {block.date}
                          </div>
                          <div style={{ position: "relative", zIndex: 10 }}>
                            {block.photoUrl ? (
                              <img
                                src={block.photoUrl}
                                alt=""
                                style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--border-color)", pointerEvents: "auto" }}
                                onClick={(event) => { event.stopPropagation(); onExpandPhoto(block.photoUrl || ""); }}
                              />
                            ) : (
                              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--input-bg)", border: "1px dashed var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "12px" }}>📷</div>
                            )}
                          </div>
                        </div>
                        <div className="memo-tags-text" style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "700", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tagsText}</div>
                        <div className="memo-preview-text" style={{ fontSize: "13px", color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewText}</div>
                        <div style={{ textAlign: "center", marginTop: "8px", fontSize: "10px", color: "var(--text-muted)", fontWeight: "700" }}>▼ タップして展開</div>
                      </div>
                      <div className="memo-detail" style={{ display: block.isExpanded ? "block" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            {block.isReadOnly ? typeBadge : memoReadOnly ? (
                              <span className="memo-date" style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-sub)" }}>{block.date}</span>
                            ) : (
                              <input type="date" className="memo-date" value={block.date} onChange={(event) => updateMemoBlock(block.id, { date: event.target.value })} style={{ width: "fit-content", flex: "0 1 auto", padding: "4px 0" }} />
                            )}
                          </div>
                          <div style={{ position: "relative", zIndex: 10 }}>
                            {block.photoUrl ? (
                              <img
                                src={block.photoUrl}
                                alt=""
                                style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border-color)", cursor: "pointer", pointerEvents: "auto" }}
                                onClick={(event) => { event.stopPropagation(); onExpandPhoto(block.photoUrl || ""); }}
                              />
                            ) : (
                              <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--input-bg)", border: "1px dashed var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>📷</div>
                            )}
                          </div>
                        </div>
                        {block.isReadOnly || memoReadOnly ? (
                          <div style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: 1.6, marginTop: "4px", padding: "12px", background: "var(--input-bg)", borderRadius: "12px" }}>{block.text || "（本文なし）"}</div>
                        ) : (
                          <textarea className="memo-text" rows={2} placeholder="エピソードを入力..." value={block.text} onChange={(event) => updateMemoBlock(block.id, { text: event.target.value })} onBlur={() => window.scrollTo(0, 0)} />
                        )}
                        <div className="memo-tags-area" style={{ marginTop: "8px", position: "relative" }}>
                          <div className="memo-selected-tags" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                            {block.tags.map((tag) => (
                              <span key={`${block.id}-${tag}`} style={{ background: "var(--primary-light)", color: "var(--primary)", fontSize: "10px", padding: "3px 8px", borderRadius: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                {tag}
                                {!memoReadOnly ? <span onClick={() => removeMemoTag(block.id, tag)} style={{ cursor: "pointer", fontWeight: "900", lineHeight: 1 }}>×</span> : null}
                              </span>
                            ))}
                          </div>
                          {!memoReadOnly ? (
                            <button type="button" className="memo-add-tag-btn" onClick={() => updateMemoBlock(block.id, { isDropdownOpen: !block.isDropdownOpen })} style={{ background: "var(--primary-light)", border: "none", color: "var(--primary)", fontSize: "11px", padding: "6px 12px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", transition: "0.2s" }}>
                              ＋ エピソードタグを追加
                            </button>
                          ) : null}
                          <div className="memo-tag-dropdown" style={{ display: block.isDropdownOpen && !memoReadOnly ? "block" : "none", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "12px", marginTop: "10px", boxShadow: "var(--shadow-md)", position: "absolute", zIndex: 20, width: "100%" }}>
                            <div style={{ position: "absolute", top: "-6px", left: "20px", width: "10px", height: "10px", background: "#FFF", borderTop: "1px solid var(--border-color)", borderLeft: "1px solid var(--border-color)", transform: "rotate(45deg)" }} />
                            <div className="memo-tag-dropdown-content" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "120px", overflowY: "auto" }}>
                              {lineFactTags.map((tag) => {
                                const isSelected = block.tags.includes(tag);
                                return (
                                  <div key={`${block.id}-${tag}`} className={`chip${isSelected ? " selected-fact-chip active" : ""}`} onClick={() => toggleMemoTag(block.id, tag)}>
                                    {tag}
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ textAlign: "right", marginTop: "8px" }}>
                              <button type="button" onClick={() => updateMemoBlock(block.id, { isDropdownOpen: false })} style={{ background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>閉じる</button>
                            </div>
                          </div>
                        </div>
                        {!memoReadOnly ? (
                          <div className="memo-block__actions">
                            <button type="button" onClick={() => deleteMemoBlock(block.id)} style={{ background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🗑️</button>
                            <button
                              type="button"
                              onClick={() => updateMemoBlock(block.id, { isExpanded: false })}
                              style={{
                                background: "var(--primary-gradient)",
                                color: "#FFF",
                                border: "none",
                                padding: "10px 20px",
                                borderRadius: "20px",
                                fontWeight: "700",
                                fontSize: "13px",
                                boxShadow: "var(--shadow-sm)",
                              }}
                            >
                              💾 このまま保存
                            </button>
                          </div>
                        ) : null}
                        <div onClick={() => updateMemoBlock(block.id, { isExpanded: false })} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", marginTop: "12px", cursor: "pointer", padding: "8px 0" }}>▲ 閉じる</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {!isEditingDummyCustomer ? (
            <div className="add-memo-btn" id="addMemoBtn" data-original-click={"addNewMemoBlock()"} onClick={addNewMemoBlock}>＋ 日付とエピソードを追加</div>
          ) : null}
        </div>
        <div className="modal-content__footer">
          <div id="editActionArea" style={{ display: "flex", gap: "10px" }}>
            <button type="button" data-original-click={"closeEditModal()"} onClick={onClose} style={{ flex: "1", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px" }} id="cancelBtn">閉じる</button>
            {!isEditingDummyCustomer ? (
              <button
                type="button"
                data-original-click={"saveCustomerEdit()"}
                id="saveCustomerBtn"
                onClick={onSave}
                style={{
                  flex: "1",
                  background: "var(--primary)",
                  color: "#FFF",
                  border: "none",
                  padding: "14px",
                  borderRadius: "20px",
                  fontWeight: "700",
                  fontSize: "13px",
                  boxShadow: "var(--shadow-float)",
                }}
              >
                保存する
              </button>
            ) : null}
          </div>

          <div id="readOnlyActionArea" style={{ display: "none", gap: "10px", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <button data-original-click={"restoreHiddenFromModal()"} style={{ flex: "1", background: "#F0FDF4", color: "#16A34A", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px" }}>🟢 非表示を解除</button>
              <button data-original-click={"openDeleteConfirmModal()"} style={{ flex: "1", background: "var(--alert-bg)", color: "var(--alert-text)", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px" }}>🗑️ 完全に削除</button>
            </div>
            <button data-original-click={"closeEditModal()"} style={{ width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "13px" }}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}
