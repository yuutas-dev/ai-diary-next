"use client";

export default function UiCardRefactorPage() {
  const mockCustomers = [
    { id: "c1", name: "あかり", icon: "👩🏻" },
    { id: "c2", name: "みお", icon: "👩🏼" },
    { id: "c3", name: "さき", icon: "👩🏽" },
  ];

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
          {mockCustomers.map((customer, index) => (
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
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#493d41" }}>
                    {customer.name} さん
                  </div>
                  <div style={{ fontSize: "11px", color: "#9b8a90" }}>ダミー顧客アイコン</div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
