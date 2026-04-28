"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type PreviewCustomer = {
  id: string;
  name: string;
  iconUrl: string | null;
  icon: string;
  source: "db" | "mock";
};

type Props = {
  customers: PreviewCustomer[];
};

export default function UiCardRefactorClient({ customers }: Props) {
  const [frontCard, setFrontCard] = useState<"customer" | "photo">("customer");
  const [searchText, setSearchText] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customers[0]?.id ?? null);

  const filteredCustomers = useMemo(() => {
    const q = searchText.trim();
    if (!q) return customers;
    return customers.filter((customer) => customer.name.includes(q));
  }, [customers, searchText]);

  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ||
    customers.find((customer) => customer.id === selectedCustomerId) ||
    null;

  const toggleCards = () => {
    setFrontCard((prev) => (prev === "customer" ? "photo" : "customer"));
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #fff7fb 0%, #fff9fb 45%, #ffffff 100%)",
        padding: "18px 14px 110px",
      }}
    >
      <div style={{ maxWidth: "420px", margin: "0 auto" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#8f7a80", marginBottom: "12px" }}>
          カードUIテスト中
        </div>

        <div style={{ position: "relative", height: "540px" }}>
          <motion.div
            animate={
              frontCard === "photo"
                ? { y: 18, scale: 0.96, rotateX: 3, opacity: 0.78 }
                : { y: 0, scale: 1, rotateX: 0, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 190, damping: 24 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: frontCard === "customer" ? 30 : 10,
              borderRadius: "24px",
              border: "1px solid #f1e2e9",
              background: "linear-gradient(180deg, #ffffff 0%, #fffdfd 100%)",
              boxShadow: "0 20px 36px rgba(198, 134, 151, 0.18)",
              padding: "16px 14px",
              transformOrigin: "center top",
              overflow: "hidden",
            }}
            drag={frontCard === "customer" ? "y" : false}
            dragConstraints={{ top: 0, bottom: 140 }}
            onDragEnd={(_, info) => {
              if (frontCard === "customer" && info.offset.y > 70) toggleCards();
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#4a3f43", marginBottom: "12px" }}>👤 誰に送る？</div>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="お客様を検索..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: "14px",
                border: "1px solid #efdde4",
                background: "#fffafc",
                padding: "11px 12px",
                color: "#564a4f",
                fontSize: "13px",
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
              {filteredCustomers.map((customer) => {
                const isSelected = selectedCustomerId === customer.id;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer",
                      minWidth: "58px",
                    }}
                  >
                    <div
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius: "50%",
                        border: isSelected ? "2px solid #df8a9b" : "1px solid #f0dee5",
                        background: "#fff3f8",
                        boxShadow: isSelected ? "0 6px 14px rgba(223,138,155,0.30)" : "none",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                      }}
                    >
                      {customer.iconUrl ? (
                        <img
                          src={customer.iconUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "26px" }}>{customer.icon}</span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#6b5d62",
                        textAlign: "center",
                      }}
                    >
                      {customer.name}
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedCustomer ? (
                <motion.div
                  key={selectedCustomer.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.26, ease: "easeOut" }}
                  style={{
                    marginTop: "14px",
                    borderRadius: "16px",
                    background: "linear-gradient(180deg, #fff6fa 0%, #fff 100%)",
                    border: "1px solid #f0dde5",
                    padding: "12px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#815f69", marginBottom: "6px" }}>
                    📖 過去エピソード
                  </div>
                  <div style={{ fontSize: "12px", color: "#594d52", lineHeight: 1.65 }}>
                    最近はやわらかいトーンが好印象。冒頭に短い感謝を入れると返信率が上がる傾向です。
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#8b6170",
                        background: "#ffeef4",
                        border: "1px solid #f8dce7",
                        padding: "4px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      お気に入りムード：清楚
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#8b6170",
                        background: "#ffeef4",
                        border: "1px solid #f8dce7",
                        padding: "4px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      事実タグ：#初来店
                    </span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <motion.div
            animate={
              frontCard === "photo"
                ? { y: 0, scale: 1, opacity: 1 }
                : { y: 20, scale: 0.965, opacity: 0.86 }
            }
            transition={{ type: "spring", stiffness: 190, damping: 26 }}
            style={{
              position: "absolute",
              inset: "26px 8px 0",
              zIndex: frontCard === "photo" ? 35 : 5,
              borderRadius: "24px",
              border: "1px solid #f4e3ea",
              background: "linear-gradient(180deg, #fffefe 0%, #fff8fb 100%)",
              boxShadow: "0 16px 34px rgba(188, 138, 151, 0.16)",
              padding: "24px 14px 14px",
            }}
          >
            <button
              type="button"
              onClick={toggleCards}
              style={{
                position: "absolute",
                top: "-14px",
                left: "50%",
                transform: "translateX(-50%)",
                border: "1px solid #f2dce5",
                borderRadius: "999px",
                padding: "6px 16px",
                background: "#fff4f8",
                color: "#c86f87",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(205, 130, 151, 0.23)",
              }}
            >
              📷
            </button>

            <div style={{ fontSize: "15px", fontWeight: 800, color: "#4c4044", marginBottom: "14px" }}>
              写メ日記カード
            </div>
            <div
              style={{
                height: "320px",
                borderRadius: "18px",
                border: "1.5px dashed #e8cad7",
                background: "linear-gradient(180deg, #fff6fa 0%, #fff 100%)",
                display: "grid",
                placeItems: "center",
                color: "#9c727e",
                fontWeight: 700,
                fontSize: "13px",
                textAlign: "center",
                padding: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "30px", marginBottom: "10px" }}>🖼️</div>
                大きな写真アップロード枠
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#ae8590" }}>
                  SNS / ブログ用の画像をここに配置
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "10px 14px calc(max(10px, env(safe-area-inset-bottom, 0px)) + 8px)",
          background: "linear-gradient(180deg, rgba(255,249,252,0) 0%, rgba(255,249,252,0.94) 30%, rgba(255,249,252,1) 100%)",
        }}
      >
        <div style={{ maxWidth: "420px", margin: "0 auto" }}>
          <button
            type="button"
            style={{
              width: "100%",
              border: "none",
              borderRadius: "999px",
              padding: "13px 16px",
              background: "linear-gradient(135deg, #df8a9b 0%, #ec9aae 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "14px",
              boxShadow: "0 14px 24px rgba(223, 138, 155, 0.34)",
            }}
          >
            ✨ AIで作成する
          </button>
        </div>
      </div>
    </main>
  );
}
