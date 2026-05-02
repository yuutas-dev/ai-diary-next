export type ActiveTab = "create" | "data" | "settings";
export type CreateMode = "text" | "photo";
export type VisitStatus = "yes" | "no";
export type StyleTab = "cute" | "custom" | "neat";
export type DataView = "customer" | "history";
export type BusinessType = "cabaret" | "fuzoku" | "garuba";
export type ListFilter = "alert" | "all" | "vip" | "new" | "second" | "regular";
export type IconTheme = "glass" | "jewel" | "perfume" | "moon_star" | "flower" | "teacup" | "symbol";
export type AppTheme = "pink" | "blue";
export type AppFont = "standard" | "maru" | "mincho";

export interface MemoBlock {
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

export interface CustomerEntry {
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

export interface Customer {
  id: string | null;
  name: string;
  memo?: string;
  tags?: string;
  entries: CustomerEntry[];
  tagsArray: string[];
  /** DB customers.business_type（未設定の旧データは undefined） */
  businessType?: BusinessType;
  /** マスタ／タグ由来のダミー（リスト取得後に装飾） */
  isDummy?: boolean;
  /** マスターダミー行のみ true */
  isMasterDummy?: boolean;
}

/** /api/entries/history の行 — 作った文章タブ用（業態フィルタと独立） */
export interface HistorySourceRow {
  id: string;
  customerId: string | null;
  customerName: string;
  customerTags: string[];
  displayText: string;
  displayDate: string;
  inputText: string;
}

export type CustomerSource = { masters: Customer[]; users: Customer[] };
