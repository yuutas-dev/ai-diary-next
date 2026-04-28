import { createClient } from "@supabase/supabase-js";
import UiCardRefactorClient from "./ui-card-refactor-client";

type PreviewCustomer = {
  id: string;
  name: string;
  iconUrl: string | null;
  icon: string;
  source: "db" | "mock";
};

const MOCK_CUSTOMERS: PreviewCustomer[] = [
  { id: "c1", name: "あかり", icon: "👩🏻", iconUrl: null, source: "mock" },
  { id: "c2", name: "みお", icon: "👩🏼", iconUrl: null, source: "mock" },
  { id: "c3", name: "さき", icon: "👩🏽", iconUrl: null, source: "mock" },
];

const FALLBACK_ICONS = ["👩🏻", "👩🏼", "👩🏽", "👩🏾", "👩🏿"];

function pickIconUrl(row: Record<string, unknown>): string | null {
  const candidates = [
    row.icon_url,
    row.avatar_url,
    row.profile_image_url,
    row.photo_url,
    row.image_url,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function toPreviewCustomer(row: Record<string, unknown>, idx: number): PreviewCustomer {
  const idValue = row.id;
  const nameValue = row.name;
  return {
    id: typeof idValue === "string" ? idValue : String(idValue ?? `row-${idx}`),
    name: typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : `お客様 ${idx + 1}`,
    iconUrl: pickIconUrl(row),
    icon: FALLBACK_ICONS[idx % FALLBACK_ICONS.length],
    source: "db",
  };
}

async function loadPreviewCustomers(): Promise<PreviewCustomer[]> {
  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !supabaseKey) return MOCK_CUSTOMERS;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(5);
    if (error || !data || data.length === 0) return MOCK_CUSTOMERS;
    return data.slice(0, 5).map((row, idx) => toPreviewCustomer(row as Record<string, unknown>, idx));
  } catch {
    return MOCK_CUSTOMERS;
  }
}

export default async function UiCardRefactorPage() {
  const previewCustomers = await loadPreviewCustomers();
  return <UiCardRefactorClient customers={previewCustomers} />;
}
