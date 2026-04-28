import { createClient } from "@supabase/supabase-js";

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

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "20px 14px 28px",
        background: "linear-gradient(180deg, #fff9fb 0%, #fff 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#8f7a80",
            marginBottom: "12px",
          }}
        >
          カードUIテスト中
        </div>

        <section
          style={{
            position: "relative",
            paddingTop: "8px",
          }}
        >
          {previewCustomers.map((customer, index) => (
            <article
              key={customer.id}
              style={{
                background: "#ffffff",
                border: "1px solid #f1e3e8",
                borderRadius: "18px",
                boxShadow: "0 10px 24px rgba(223, 138, 155, 0.14)",
                padding: "14px 14px 12px",
                marginTop: index === 0 ? 0 : "-20px",
                position: "relative",
                zIndex: 10 - index,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {customer.iconUrl ? (
                  <img
                    src={customer.iconUrl}
                    alt=""
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      background: "#fff2f6",
                      border: "1px solid #f6dbe4",
                    }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "22px",
                      background: "#fff2f6",
                      border: "1px solid #f6dbe4",
                    }}
                  >
                    {customer.icon}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#493d41" }}>
                    {customer.name} さん
                  </div>
                  <div style={{ fontSize: "11px", color: "#9b8a90" }}>
                    {customer.source === "db" ? "Supabaseデータ" : "ダミー顧客アイコン"}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
