"use client";

import { useCallback, useEffect, useState } from "react";

type ActiveTab = "create" | "data" | "settings";
type CreateMode = "text" | "photo";
type VisitStatus = "yes" | "no";
type StyleTab = "cute" | "custom" | "neat";
type DataView = "customer" | "history";

const LIFF_ID = "2009902106-W8zW5hJA";
const DEFAULT_USER_ID = "test-user";

interface CustomerEntry {
  id?: string | null;
  date?: string;
  text?: string;
  tags?: string[];
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

  const quickAccessCustomers = customerData
    .filter((customer) => !customer.tagsArray.includes("非表示"))
    .sort((a, b) => {
      const statsA = getCustomerStats(a);
      const statsB = getCustomerStats(b);
      if (statsA.isVip && !statsB.isVip) return -1;
      if (!statsA.isVip && statsB.isVip) return 1;
      return statsB.count - statsA.count;
    })
    .slice(0, 15);

  const visibleCustomers = customerData.filter((customer) => !customer.tagsArray.includes("非表示"));

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

  <div id="photoModal" className="modal-overlay" style={{zIndex: "10008"}} data-original-click={"closePhotoModal(event)"}>
    <div style={{position: "relative", maxWidth: "90%", maxHeight: "90%", margin: "auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}} data-original-click={"event.stopPropagation()"}>
      <img id="expandedPhoto" src="" style={{width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)"}} />
      <div data-original-click={"closePhotoModal(event)"} style={{position: "absolute", top: "-12px", right: "-12px", background: "#FFF", width: "32px", height: "32px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "16px", color: "var(--text-main)", cursor: "pointer", boxShadow: "var(--shadow-sm)"}}>×</div>
    </div>
  </div>

  <div id="cardActionModalBackdrop" className="half-modal-backdrop" data-original-click={"closeCardActionModal()"}></div>
  <div id="cardActionHalfModal" className="half-modal" style={{zIndex: "10002"}}>
    <div className="half-modal-handle"></div>
    <h3 id="actionModalName" style={{margin: "0 0 16px", fontWeight: "700", textAlign: "center", color: "var(--text-main)"}}></h3>
    <button id="btnToggleVip" data-original-click={"toggleVipPin()"} style={{width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "14px", marginBottom: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "var(--shadow-sm)"}}></button>
    <button data-original-click={"setHidden()"} style={{width: "100%", background: "var(--alert-bg)", color: "var(--alert-text)", border: "1px solid transparent", padding: "14px", borderRadius: "12px", fontWeight: "700", fontSize: "14px", marginBottom: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"}}>💤 非表示にする</button>
  </div>

  <div id="createDetailsBackdrop" className="half-modal-backdrop" data-original-click={"closeCreateDetailsModal()"}></div>
  <div id="createDetailsHalfModal" className="half-modal create-details-half-modal">
    <div className="half-modal-handle" data-original-click={"closeCreateDetailsModal()"} role="button" tabIndex={0} data-original-keydown={"if(event.key==='Enter'||event.key===' '){ event.preventDefault(); closeCreateDetailsModal(); }"}></div>
    <div className="create-details-modal-header">
      <span className="label" style={{margin: "0"}}>📝 詳細を追加</span>
      <button type="button" className="create-details-modal-close" data-original-click={"closeCreateDetailsModal()"} aria-label="閉じる">×</button>
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
      <div className="tags-scroll-container create-details-tags-grid" id="moodTagsArea" style={{marginBottom: "16px"}}></div>

      {/* 事実タグ */}
      <span className="label">📝 今日の出来事（トピック）</span>
      <div className="tags-scroll-container create-details-tags-grid" id="factTagsArea"></div>
      <div style={{marginTop: "8px", display: "flex", gap: "8px", marginBottom: "16px"}}>
        <input type="text" id="customFactTagInput" placeholder="＋オリジナル出来事追加" className="input-field" style={{padding: "10px", fontSize: "12px", background: "var(--input-bg)", border: "1px solid transparent", flex: "1"}} />
        <button data-original-click={"addCustomFactTag()"} style={{background: "var(--text-sub)", color: "#fff", border: "none", padding: "0 14px", borderRadius: "10px", fontWeight: "700", fontSize: "12px", cursor: "pointer"}}>追加</button>
      </div>

      {/* 本文 */}
      <span className="label">📝 今日の出来事・接客メモ</span>
      <div className="textarea-wrapper">
        <textarea id="todayEpisodeInput" className="input-field" placeholder="（例）こけてみんなで爆笑した！ウザ絡みされたけどシャンパン入れてくれた笑&#10;※AIが空気を読んで綺麗なメッセージにします✨" data-original-input={"autoScrollTextarea()"} style={{background: "var(--input-bg)", border: "1px solid transparent"}}></textarea>
        <div className="clear-btn" data-original-click={"clearEpisodeInput()"}>🧹 クリア</div>
      </div>
    </div>
  </div>

  <div id="hiddenListModal" className="modal-overlay" style={{zIndex: "10005"}}>
    <div className="modal-content" style={{maxHeight: "85vh", display: "flex", flexDirection: "column"}}>
      <h2 style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}}>💤 非表示にした顧客</h2>
      <p style={{textAlign: "center", fontSize: "11px", color: "var(--text-sub)", marginTop: "-10px", marginBottom: "16px", fontWeight: "700"}}>カードを長押しして記録を確認</p>
      <div id="hiddenCustomersArea" style={{overflowY: "auto", flex: "1", paddingBottom: "20px", margin: "-10px"}}></div>
      <button data-original-click={"closeHiddenListModal()"} style={{width: "100%", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", marginTop: "20px"}}>閉じる</button>
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

  <div id="styleModal" className="modal-overlay">
    <div className="modal-content style-modal-content">
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
      <button data-original-click={"closeStyleModal()"} style={{width: "100%", background: "var(--text-main)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", marginTop: "8px"}}>設定を保存して閉じる</button>
    </div>
  </div>

  <div id="helpModal" className="modal-overlay">
    <div className="modal-content help-modal-content">
      <h2 id="helpModalTitle" style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}}></h2>
      <div id="helpModalBody" className="help-body"></div>
      <button data-original-click={"closeHelpModal()"} style={{width: "100%", background: "var(--text-main)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700"}}>閉じる</button>
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

  <div id="editCustomerModal" className="modal-overlay" style={{zIndex: "10006"}}>
    <div className="modal-content">
      <h2 style={{margin: "0 0 20px", fontWeight: "700", textAlign: "center"}} id="modalTitle">顧客情報の編集</h2>
      <input type="hidden" id="editCustomerIndex" />
      <input type="hidden" id="isCreateMode" value="false" />
      <input type="hidden" id="editCustomerId" />

      <span className="label">名前</span>
      <input type="text" id="editCustomerName" className="input-field" style={{marginBottom: "16px", background: "#FFF", border: "1px solid var(--border-color)"}} />

      <div className="accordion-header" data-original-click={"toggleTagAccordion()"}>
        <span>🏷️ 属性タグ</span><span id="tagAccordionIcon">▼</span>
      </div>
      <div className="accordion-content" id="tagAccordionContent">
        <div id="editAttributeTagsArea" style={{display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px"}}></div>
        <div style={{display: "flex", gap: "8px"}}>
          <input type="text" id="customAttrInput" className="input-field" placeholder="オリジナルタグ..." style={{padding: "10px", fontSize: "12px", background: "#FFF", border: "1px solid var(--border-color)"}} />
          <button id="addAttrBtn" data-original-click={"addCustomAttributeTag()"} style={{background: "var(--primary)", color: "#FFF", border: "none", borderRadius: "10px", padding: "0 14px", fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap"}}>追加</button>
        </div>
      </div>

      <span className="label">📝 接客メモ</span>
      <div className="memo-blocks-wrapper"><div id="editMemoBlocksArea"></div></div>
      <div className="add-memo-btn" id="addMemoBtn" data-original-click={"addNewMemoBlock()"}>＋ 日付とエピソードを追加</div>

      <div id="editActionArea" style={{display: "flex", gap: "10px"}}>
        <button data-original-click={"closeEditModal()"} style={{flex: "1", background: "var(--input-bg)", color: "var(--text-main)", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px"}} id="cancelBtn">閉じる</button>
        <button data-original-click={"saveCustomerEdit()"} id="saveCustomerBtn" style={{flex: "1", background: "var(--primary)", color: "#FFF", border: "none", padding: "14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px", boxShadow: "var(--shadow-float)"}}>保存する</button>
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
                    <div className="story-item" key={customer.id || customer.name}>
                      <div className={ringClass}>
                        {topBadge}
                        <div className="story-inner">{getCustomerInitial(customer.name)}</div>
                      </div>
                      <span className="story-name">{customer.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div style={{position: "relative", flexShrink: "0"}}>
            <input type="text" id="nameInput" className="input-field" placeholder="名前を入力..." data-original-input={"suggestCustomer()"} />
            <div id="resultArea" className="result-box"></div>
          </div>
          <div className="past-memo-box" style={{marginTop: "12px", marginBottom: "0"}}>
            <div id="pastMemoDisplay"><span className="past-memo-label">📖 過去のメモ</span><div style={{color: "var(--text-muted)", textAlign: "center", padding: "10px 0", fontSize: "12px"}}>(顧客を選択するか、過去の記録がありません)</div></div>
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
          <div className="accordion-header" data-original-click={"toggleCreateDetails()"} id="createDetailsHeader" style={{display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 24px", background: "#FFF", border: "1px solid var(--border-color)", borderRadius: "24px", fontSize: "13px", fontWeight: "700", color: "var(--text-main)", boxShadow: "var(--shadow-sm)", cursor: "pointer", transform: "translateY(-20px)"}}>
            📝 詳細を追加 <span style={{color: "var(--text-sub)", fontSize: "11px", fontWeight: "normal"}}>(任意)</span> <span id="createDetailsIcon">▼</span>
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
            <div className="view-toggle" data-original-click={"toggleCompactMode()"}><span id="viewIcon">🗂️ 詳細表示</span></div>
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
            <input type="text" id="customerSearch" className="input-field" placeholder="名前、タグ、メモで検索..." data-original-input={"filterCustomerList()"} style={{paddingRight: "36px", background: "#FFF", border: "1px solid var(--border-color)"}} />
            <div id="clearSearchBtn" style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.05)", color: "var(--text-sub)", width: "22px", height: "22px", borderRadius: "50%", display: "none", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", cursor: "pointer"}} data-original-click={"clearSearch()"}>×</div>
          </div>

          <div className="filter-container" style={{paddingBottom: "10px", marginBottom: "0"}}>
            <div className="filter-btn" id="filter-btn-alert" data-original-click={"setListFilter('alert')"}>
              ⚠️ 要連絡
              <div id="alertBadge" style={{display: "none", position: "absolute", top: "-6px", right: "-6px", background: "var(--alert-text)", color: "#FFF", fontSize: "9px", fontWeight: "700", minWidth: "16px", height: "16px", borderRadius: "8px", padding: "0 4px", alignItems: "center", justifyContent: "center"}}></div>
            </div>
            <div className="filter-btn active-filter" id="filter-btn-all" data-original-click={"setListFilter('all')"}>すべて</div>
            <div className="filter-btn" id="filter-btn-vip" data-original-click={"setListFilter('vip')"}>💎 一軍</div>
            <div className="filter-btn" id="filter-btn-new" data-original-click={"setListFilter('new')"}>🔰 新規</div>
            <div className="filter-btn" id="filter-btn-second" data-original-click={"setListFilter('second')"}>✌️ 2回目</div>
            <div className="filter-btn" id="filter-btn-regular" data-original-click={"setListFilter('regular')"}>👑 常連</div>
          </div>
        </div>

        <div id="customerListArea" style={{marginTop: "12px", position: "relative", zIndex: "1"}}>
          {isCustomersLoading ? (
            <>
              <div className="card skeleton" style={{height: "80px", marginBottom: "12px"}}></div>
              <div className="card skeleton" style={{height: "80px", marginBottom: "12px"}}></div>
            </>
          ) : visibleCustomers.length === 0 ? (
            <div className="card" style={{textAlign: "center", padding: "28px 18px", color: "var(--text-sub)"}}>
              <div style={{fontSize: "28px", marginBottom: "8px"}}>🗂️</div>
              <div style={{fontWeight: "700", marginBottom: "6px"}}>顧客データがありません</div>
              <div style={{fontSize: "13px", lineHeight: "1.6"}}>顧客を追加するか、検索条件を見直してください。</div>
            </div>
          ) : (
            visibleCustomers.map((customer) => {
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
                      <button type="button" className="action-btn" style={{background: "var(--primary-light)", color: "var(--primary)", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", transition: "0.2s"}}><span className="action-icon" style={{fontSize: "14px"}}>✏️</span><span className="action-text">日記作成</span></button>
                      <button type="button" className="action-btn" style={{background: "var(--input-bg)", color: "var(--text-sub)", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", transition: "0.2s"}}><span className="action-icon" style={{fontSize: "14px"}}>⚙️</span><span className="action-text">編集</span></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div id="historyListArea" style={{display: "none", marginTop: "12px", position: "relative", zIndex: "1"}}></div>
        <div className="fab" role="button" tabIndex={0} data-original-click={"openCreateModal()"} data-original-keydown={"if(event.key==='Enter'||event.key===' '){ event.preventDefault(); openCreateModal(); }"}>＋</div>
      </div>

      <div className="page page-settings" style={{position: "relative"}}>
        <h2 style={{margin: "0 0 16px", fontWeight: "700", fontSize: "18px"}}>設定・情報</h2>

        <div className="card" style={{marginBottom: "24px"}}>
          <div className="setting-item" style={{borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "16px"}} data-original-click={"openStyleModal()"}>
            <span>🎨 AIスタイル・口調設定</span>
            <span className="settings-val" id="styleOverviewText">かわいい・清楚・カスタム</span>
          </div>
          <div className="setting-item" style={{borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "16px"}}>
            <span>🏢 業態設定</span>
            <select className="input-field" id="businessType" data-original-change={"updateChipsAndSave()"} style={{width: "140px", padding: "6px", fontWeight: "700", textAlign: "right", border: "none", background: "transparent"}}>
              <option value="cabaret">キャバクラ</option>
              <option value="fuzoku">風俗・メンエス</option>
              <option value="host">ホスト</option>
            </select>
          </div>
          <div className="setting-item">
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"}}>
              <h3 className="section-title" style={{margin: "0"}}>🎨 アイコンテーマ</h3>
            </div>
            <select id="icon-theme-select" className="input-field" style={{width: "100%"}}>
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
          <div className="settings-item" data-original-click={"openHiddenListModal()"}><span>💤 非表示にした顧客</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
          <div className="settings-item" data-original-click={"openHelpModal()"}><span>📖 アプリの使い方と仕様（必読）</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
        </div>
        <div className="settings-list" style={{marginBottom: "40px"}}>
          <div className="settings-item" data-original-click={"alert('利用規約のページが開きます')"}><span>📄 利用規約</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
          <div className="settings-item" data-original-click={"alert('プライバシーポリシーのページが開きます')"}><span>🛡 プライバシーポリシー</span><span style={{color: "var(--text-muted)"}}>▶</span></div>
          <div className="settings-item"><span>ℹ️ バージョン</span><span className="settings-val">11.0.0 (Stable)</span></div>
        </div>

        <div data-original-click={"promptDevMode()"} style={{position: "absolute", bottom: "10px", right: "10px", fontSize: "11px", color: "var(--text-muted)", cursor: "pointer", userSelect: "none"}}>dev</div>
      </div>
    </main>

    <footer className="fixed-footer">
      <nav className="bottom-nav">
        <label htmlFor="nav-create" className="nav-item tab-create"><span style={{fontSize: "18px"}}>📝</span>作成</label>
        <label htmlFor="nav-data" className="nav-item tab-data"><span style={{fontSize: "18px"}}>📖</span>顧客</label>
        <label htmlFor="nav-settings" className="nav-item tab-settings"><span style={{fontSize: "18px"}}>⚙️</span>設定</label>
      </nav>
    </footer>
  </div>
    </>
  );
}
