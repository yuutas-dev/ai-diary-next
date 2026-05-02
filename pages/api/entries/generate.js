import { createClient } from '@supabase/supabase-js';
import { requireResolvedUserId } from '../../../lib/validateUserId.js';

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}
function parseRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}
function trimText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof tags === 'string' && tags.trim()) return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [];
}
function getSupabase() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません');
  return createClient(supabaseUrl, supabaseKey);
}
function getTodayFormatted() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isEmptyImagePayload(value) {
  if (value == null) return true;
  if (typeof value !== 'string') return true;
  return value.trim() === '';
}

function parseClientImagePayload(raw) {
  if (isEmptyImagePayload(raw)) return null;
  const s = String(raw).trim();
  if (s.startsWith('data:')) {
    const comma = s.indexOf(',');
    if (comma === -1) throw new Error('画像データの形式が不正です');
    const meta = s.slice(5, comma);
    const dataPart = s.slice(comma + 1);
    const mimeMatch = /^([^;]+)/.exec(meta);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const isBase64 = /;base64/i.test(meta);
    const buffer = isBase64 ? Buffer.from(dataPart, 'base64') : Buffer.from(decodeURIComponent(dataPart), 'binary');
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    return { buffer, mimeType, filename: `upload.${ext}` };
  }
  const buffer = Buffer.from(s, 'base64');
  if (buffer.length === 0) throw new Error('画像データが空です');
  return { buffer, mimeType: 'image/jpeg', filename: 'upload.jpg' };
}

function getDifyApiBase() {
  const fromEnv = (process.env.DIFY_API_URL || process.env.DIFY_BASE_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'https://api.dify.ai/v1';
}

async function uploadImageToDify({ apiKey, userId, buffer, filename, mimeType }) {
  const base = getDifyApiBase();
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'image/jpeg' }), filename || 'photo.jpg');
  form.append('user', userId);
  const res = await fetch(`${base}/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Difyファイルアップロードエラー: ${res.status} ${text}`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Difyファイルアップロードの応答が不正です');
  }
  const id = json?.id;
  if (!id) throw new Error('Difyファイルアップロードに file id が含まれませんでした');
  return String(id);
}

async function findCustomerIdByName({ supabase, userId, customerId, name }) {
  const trimmedCustomerId = trimText(customerId);
  if (trimmedCustomerId) {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('id', trimmedCustomerId)
      .maybeSingle();
    if (error) throw new Error(`顧客取得エラー: ${error.message}`);
    if (data?.id) return data.id;
    const master = await supabase
      .from('customers')
      .select('id')
      .eq('id', trimmedCustomerId)
      .eq('is_master_dummy', true)
      .maybeSingle();
    if (master.error) throw new Error(`顧客取得エラー: ${master.error.message}`);
    if (master.data?.id) return master.data.id;
  }
  const trimmedName = trimText(name);
  if (!trimmedName) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .eq('name', trimmedName)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(`顧客取得エラー: ${error.message}`);
  return data?.[0]?.id || null;
}

/** 営業・生成のみログなどを除外し、実来店相当のエントリのみ pastMemo 文脈に使う */
function isVisitLikeEntryForPastMemo(entry) {
  const raw = entry?.entry_type;
  if (raw == null || String(raw).trim() === '') return true;
  const t = String(raw).trim().toLowerCase();
  return t === 'visit' || t === 'legacy';
}

// 【NEW】「直近の有効な来店カルテ（エピソードあり）」だけをDifyの文脈用に自動抽出する
async function fetchValidPastContext({ supabase, userId, customerId }) {
  if (!customerId) return '';

  const { data, error } = await supabase
    .from('customer_entries')
    .select('entry_date, input_memo, input_tags, entry_type')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return '';

  const visitLikeRows = data.filter(isVisitLikeEntryForPastMemo);
  if (visitLikeRows.length === 0) return '';

  // メモかタグのどちらかが入力されている最新の「意味のある」レコードを探す（sales は上で除外済み）
  const validEntry = visitLikeRows.find(
    (entry) =>
      (entry.input_memo && entry.input_memo.trim() !== '') ||
      (Array.isArray(entry.input_tags) && entry.input_tags.length > 0),
  );

  if (!validEntry) return '';

  const memo = validEntry.input_memo || '';
  const tags = Array.isArray(validEntry.input_tags) ? validEntry.input_tags.join(', ') : '';
  
  let context = `[前回の来店日: ${validEntry.entry_date}]`;
  if (tags) context += `\nタグ: ${tags}`;
  if (memo) context += `\nエピソード: ${memo}`;
  
  return context;
}

async function createDraftEntry({ supabase, userId, customerId, visitStatus, episodeText, factTags, moodTags, aiText, mode }) {
  if (mode === 'diary' || mode === 'photo' || !customerId) return null;

  const hasEpisodeContent = (episodeText && episodeText.length > 0) || (factTags && factTags.length > 0);
  const entryType = hasEpisodeContent ? (visitStatus === 'visit' ? 'visit' : 'sales') : 'generation_only';

  const { data, error } = await supabase
    .from('customer_entries')
    .insert({
      user_id: userId,
      customer_id: customerId,
      entry_type: entryType,
      entry_date: getTodayFormatted(),
      input_memo: hasEpisodeContent ? episodeText : '',
      input_tags: hasEpisodeContent ? [...factTags, ...moodTags] : [],
      photo_url: null,
      ai_generated_text: aiText,
      final_sent_text: null,
      delivery_status: 'draft',
    })
    .select('id')
    .single();
  if (error) {
    console.error('Customer entries insert error:', error);
    return null;
  }
  return data?.id || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const data = parseRequestBody(req.body);
    const userId = requireResolvedUserId(data?.userId, res);
    if (!userId) return;
    const difyApiKey = (process.env.DIFY_API_KEY || '').trim();
    if (!difyApiKey) throw new Error('Difyの環境変数が読み込めていません');
    const supabase = getSupabase();
    const mode = data?.messageMode === 'diary' || data?.messageMode === 'photo' ? 'diary' : 'line';
    const visitStatus = data?.visitStatus === 'visit' ? 'visit' : 'sales';
    const episodeText = typeof data?.episodeText === 'string' ? data.episodeText : (typeof data?.episode === 'string' ? data.episode : '');
    const factTags = normalizeTags(data?.factTags || data?.episodeTags);
    const moodTags = normalizeTags(data?.moodTags);
    const customerTags = normalizeTags(data?.customerTags);
    const favoriteTexts = Array.isArray(data?.favoriteTexts)
      ? data.favoriteTexts
          .map((text) => (typeof text === 'string' ? text.trim() : ''))
          .filter(Boolean)
          .slice(0, 5)
          .join('\n')
      : (typeof data?.favoriteTexts === 'string' ? data.favoriteTexts : '');
    const favoriteTextCount = favoriteTexts ? favoriteTexts.split('\n').filter(Boolean).length : 0;
    const baseStyleText = trimText(data?.baseStyleText);
    const customerName = trimText(data?.customerName);
    const customerId = await findCustomerIdByName({ supabase, userId, customerId: data?.customerId, name: customerName });

    // 【NEW】フロントエンドから送られる不確かな `pastMemo` に依存せず、DBから確実に抽出
    const autoFetchedPastContext = await fetchValidPastContext({ supabase, userId, customerId });

    const difyInputs = {
      customerName,
      businessType: data?.businessType || 'cabaret',
      customerRank: data?.customerRank || '新規',
      visitCount: String(data?.visitCount || '1'),
      visitStatus: data?.visitStatus || visitStatus,
      isAlert: String(data?.isAlert || 'false'),
      dayOfWeek: data?.dayOfWeek || '',
      currentMonth: data?.currentMonth || '',
      episodeText: data?.episodeText || episodeText,
      pastMemo: autoFetchedPastContext, // DBから取得したクリーンな履歴をセット
      customerTags: data?.customerTags || '',
      factTags: data?.factTags || '',
      moodTags: data?.moodTags || '',
      style: data?.style || 'cute',
      tension: data?.tension || '3',
      emoji: data?.emoji || '4',
      customText: data?.customText || '',
      baseStyleText,
      favoriteTexts,
      messageMode: mode,
    };

    if (!isEmptyImagePayload(data?.imageFile)) {
      const parsed = parseClientImagePayload(data.imageFile);
      if (parsed) {
        const uploadFileId = await uploadImageToDify({
          apiKey: difyApiKey,
          userId,
          buffer: parsed.buffer,
          filename: parsed.filename,
          mimeType: parsed.mimeType,
        });
        difyInputs.imageFile = {
          transfer_method: 'local_file',
          upload_file_id: uploadFileId,
          type: 'image',
        };
      }
    }

    const difyBase = getDifyApiBase();
    const difyRes = await fetch(`${difyBase}/workflows/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${difyApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: difyInputs, response_mode: 'blocking', user: userId }),
    });
    if (!difyRes.ok) throw new Error(`Dify生成エラー: ${difyRes.status} ${await difyRes.text().catch(() => '')}`);
    const difyData = await difyRes.json();
    const aiText =
      difyData?.data?.outputs?.text ||
      difyData?.data?.outputs?.answer ||
      difyData?.answer ||
      '生成されましたがテキストが空です。';
    const entryId = await createDraftEntry({
      supabase,
      userId,
      customerId,
      visitStatus,
      episodeText,
      factTags,
      moodTags,
      aiText,
      mode,
    });
    return sendJson(res, 200, { success: true, generatedText: aiText, entry_id: entryId, learned_style_count: favoriteTextCount });
  } catch (err) {
    console.error('バックエンド処理エラー:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
}
handler.__nextApiHandler = true;
