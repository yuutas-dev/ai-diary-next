import type { AppFont, AppTheme, BusinessType } from "@/types";

export const HIDDEN_DUMMY_IDS_KEY = "hidden_dummy_customer_ids";

/** 写メ日記のアップロード上限（バイト）。超える場合はアラートし読み込まない */
export const MAX_DIARY_PHOTO_FILE_BYTES = 5 * 1024 * 1024;

/** 写メ・生成 API 送信用: canvas 長辺の上限（px）と JPEG 品質（0–1）。`lib/compressImageForApi` と選択時の圧縮で共通利用 */
export const PHOTO_API_MAX_EDGE_PX = 768;
export const PHOTO_API_JPEG_QUALITY = 0.68;

export const INDUSTRY_MOOD_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: ["💖 大好き", "✨ 特別な存在", "🥂 一緒に飲みたい", "🥺 早く会いたい", "🤫 ナイショの話", "💕 ずっと一緒にいたい", "🧸 癒やされる", "🍼 頼りにしてる", "💋 ドキドキ", "👗 可愛くなりたい", "🥺 寂しいな", "📱 連絡きて嬉しい", "🖤 独占してほしい", "🎉 楽しすぎた！", "💖 いつもありがとう"],
  fuzoku: ["💖 あなたが特別", "🧸 癒やされた", "🤤 余韻", "💕 相性良すぎ", "🥺 一緒にいたかった", "🤫 2人の秘密", "💋 ドキドキした", "🍼 甘えちゃった", "🖤 独占したい", "🥺 早く会いたい", "✨ 楽しかった", "📱 連絡待ってる", "🥺 依存しちゃいそう", "💖 感謝", "💤 夢で会いたい"],
  garuba: ["🍻 乾杯したい", "✨ 楽しかった", "🥺 また話そ", "🎤 一緒に歌いたい", "💕 気になる", "🤫 2人だけの話", "📱 連絡待ってる", "🧸 癒やされた", "🎉 最高だった", "💖 いつもありがとう", "🥂 また飲もうね", "😂 笑いすぎた", "🥺 会いたい", "🌙 夜更かししたい", "💤 夢で会いたい"],
};

export const INDUSTRY_ATTRIBUTE_TAGS: Record<BusinessType, string[]> = {
  cabaret: ["太客", "細客", "常連", "新規", "痛客", "お酒好き", "下戸", "金持ち", "ケチ", "既婚", "独身", "おじさん", "若者", "イケメン", "優しい"],
  fuzoku: ["M気質", "S気質", "常連", "新規", "キモい", "優しい", "痛客", "匂いキツめ", "マナー良", "本番要求", "おじさん", "若者", "イケメン", "デブ", "ハゲ"],
  garuba: ["太客", "細客", "常連", "新規", "痛客", "お酒好き", "下戸", "金持ち", "ケチ", "既婚", "独身", "おじさん", "若者", "イケメン", "優しい"],
};

export const INDUSTRY_FACT_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: [
    "🍾 シャンパン", "🍷 ボトル", "🥂 ドリンク", "🎉 お祝い",
    "✨ 本指名", "🥂 同伴", "🍰 アフター", "⏳ 延長", "🏃‍♂️ 駆け込み",
    "😂 爆笑", "🥺 相談", "💕 恋バナ", "🎤 カラオケ", "🎮 飲みゲー",
    "🎁 プレゼント", "📸 写真", "👗 ドレス", "🍽️ フード",
    "👔 お疲れ", "🥴 泥酔", "🙇‍♀️ 席外し", "💼 出張"
  ],
  fuzoku: [
    "✨ 本指名", "🏩 ロング", "🔞 濃厚", "🧴 メンエス", "💋 キス",
    "🛁 お風呂", "🧼 泡", "💆‍♂️ 癒やし", "🛌 延長", "🏃‍♂️ スキマ",
    "👗 コスプレ", "🤐 秘密", "🥺 甘え", "🍼 イチャ",
    "👔 仕事帰り", "🥴 快感", "🤫 絶頂", "🛌 爆睡"
  ],
  garuba: [
    "🍻 乾杯", "🍹 オリカク", "🥃 テキーラ", "🍾 シャンパン",
    "🎤 カラオケ", "🎯 ダーツ", "🍜 締め", "🏃‍♂️ 終電",
    "😂 爆笑", "🥴 泥酔", "📸 チェキ", "🍽️ 差し入れ",
    "⏳ 朝まで", "🥺 ガチ恋", "👕 私服", "🙇‍♀️ バタバタ"
  ]
};

export const DIARY_FACT_CONFIGS: Record<BusinessType, string[]> = {
  cabaret: [
    "👗 新ドレス", "🍾 お祝い感謝", "🎉 満員御礼", "🥺 暇アピ", "📸 盛れた",
    "🍰 差し入れ感謝", "💇‍♀️ ヘアメ完了", "💤 営業後・余韻"
  ],
  fuzoku: [
    "✨ 枠空き", "🏩 ロング歓迎", "🏃‍♂️ 突撃歓迎", "👗 新衣装・コス", "🛁 癒やし",
    "🤫 秘密の共有", "💄 準備完了", "💤 退勤・感謝"
  ],
  garuba: [
    "🍻 乾杯しよ", "🥃 テキーラ", "🎮 フルメン", "🍜 締めラー", "🥺 暇アピ",
    "📸 チェキ感謝", "👕 私服デー", "💤 朝まで・始発"
  ],
};

export const MODE_LABELS: Record<BusinessType, { main: string; thanks: string }> = {
  fuzoku: { main: "写メ日記", thanks: "お礼日記" },
  cabaret: { main: "ブログ・SNS", thanks: "お礼LINE" },
  garuba: { main: "ブログ・SNS", thanks: "お礼LINE" },
};

/** Dify / カスタム文体の説明用プレースホルダ（UIでは未使用の場合あり） */
export const STYLE_PLACEHOLDERS: Record<BusinessType, string> = {
  cabaret:
    "（例）・語尾は○○に固定して！\n　・絵文字は😸😹😻😼😺😽🙀😿😾だけ使って！\n　・誤字や間違った使い方を自然に入れて！",
  fuzoku:
    "（例）・語尾は○○に固定して！\n　・絵文字は😸😹😻😼😺😽🙀😿😾だけ使って！\n　・誤字や間違った使い方を自然に入れて！",
  garuba:
    "（例）・語尾は○○に固定して！\n　・絵文字は😸😹😻😼😺😽🙀😿😾だけ使って！\n　・誤字や間違った使い方を自然に入れて！",
};

export const STYLE_DEFAULTS: Record<BusinessType, { tension: string; emoji: string }> = {
  cabaret: { tension: "4", emoji: "5" },
  fuzoku: { tension: "3", emoji: "4" },
  garuba: { tension: "3", emoji: "2" },
};

export const APP_THEME_OPTIONS: { value: AppTheme; label: string; description: string }[] = [
  { value: "pink", label: "Pink", description: "やさしいピンク" },
  { value: "blue", label: "Blue", description: "淡くてかわいい青" },
];

export const APP_FONT_OPTIONS: { value: AppFont; label: string; description: string }[] = [
  { value: "maru", label: "丸ゴシック", description: "やわらかい標準フォント" },
  { value: "standard", label: "標準ゴシック", description: "すっきり読みやすい" },
  { value: "mincho", label: "明朝体", description: "大人っぽくエモい" },
];

export const EMOTION_TAG_KEYWORDS = ["会いたい", "逢いたい", "逢い", "寂しい", "さみしい", "さびしい", "愛して", "好き", "秘密", "内緒", "おやすみ", "嬉しい", "うれしい", "夢心地", "待ってる", "独占", "枕", "病み", "メンヘラ"];
