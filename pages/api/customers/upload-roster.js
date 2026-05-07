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

function getSupabase() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません');
  return createClient(supabaseUrl, supabaseKey);
}

function getDifyApiBase() {
  const fromEnv = (process.env.DIFY_API_URL || process.env.DIFY_BASE_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'https://api.dify.ai/v1';
}

function parseImagePayload(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error('imageBase64 が空です');
  }
  const input = raw.trim();
  if (input.startsWith('data:')) {
    const comma = input.indexOf(',');
    if (comma === -1) throw new Error('画像データ形式が不正です');
    const meta = input.slice(5, comma);
    const dataPart = input.slice(comma + 1);
    const mimeMatch = /^([^;]+)/.exec(meta);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const isBase64 = /;base64/i.test(meta);
    const buffer = isBase64 ? Buffer.from(dataPart, 'base64') : Buffer.from(decodeURIComponent(dataPart), 'binary');
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    return { buffer, mimeType, filename: `roster.${ext}` };
  }
  return { buffer: Buffer.from(input, 'base64'), mimeType: 'image/jpeg', filename: 'roster.jpg' };
}

async function uploadImageToDify({ apiKey, userId, buffer, filename, mimeType }) {
  const base = getDifyApiBase();
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'image/jpeg' }), filename || 'roster.jpg');
  form.append('user', userId);
  const res = await fetch(`${base}/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`Difyファイルアップロードエラー: ${res.status} ${text}`);
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

function stripMarkdownFence(text) {
  const trimmed = String(text || '').trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  return trimmed;
}

function parseRosterFromUnknown(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.customers)) return value.customers;
  }

  const stripped = stripMarkdownFence(value);
  if (!stripped) throw new Error('Difyの名簿解析結果が空です');

  const tryDirect = () => JSON.parse(stripped);
  const tryArraySlice = () => {
    const start = stripped.indexOf('[');
    const end = stripped.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error('JSON配列が見つかりません');
  };

  let parsed;
  try {
    parsed = tryDirect();
  } catch {
    parsed = tryArraySlice();
  }

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed.customers)) return parsed.customers;
  }
  throw new Error('Difyの名簿解析結果が配列ではありません');
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof tags === 'string' && tags.trim()) return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function normalizeRosterRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const name = typeof row?.name === 'string' ? row.name.trim() : '';
      if (!name) return null;
      const tags = normalizeTags(row?.tags);
      return { name, tags };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });

  try {
    const data = parseRequestBody(req.body);
    const userId = requireResolvedUserId(data?.userId, res);
    if (!userId) return;

    const rosterApiKey = (process.env.DIFY_ROSTER_API_KEY || '').trim();
    if (!rosterApiKey) throw new Error('DIFY_ROSTER_API_KEY が設定されていません');

    const parsedImage = parseImagePayload(data?.imageBase64);
    const uploadFileId = await uploadImageToDify({
      apiKey: rosterApiKey,
      userId,
      buffer: parsedImage.buffer,
      filename: parsedImage.filename,
      mimeType: parsedImage.mimeType,
    });

    const difyInputs = {
      rosterImage: {
        transfer_method: 'local_file',
        upload_file_id: uploadFileId,
        type: 'image',
      },
    };

    const difyRes = await fetch(`${getDifyApiBase()}/workflows/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rosterApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: difyInputs, response_mode: 'blocking', user: userId }),
    });
    const difyText = await difyRes.text().catch(() => '');
    if (!difyRes.ok) throw new Error(`Dify名簿抽出エラー: ${difyRes.status} ${difyText}`);

    let difyData;
    try {
      difyData = JSON.parse(difyText);
    } catch {
      throw new Error('Dify名簿抽出レスポンスのJSONパースに失敗しました');
    }

    const rosterRaw =
      difyData?.data?.outputs?.roster ||
      difyData?.data?.outputs?.customers ||
      difyData?.data?.outputs?.text ||
      difyData?.data?.outputs?.answer ||
      difyData?.answer ||
      '';

    const parsedRoster = parseRosterFromUnknown(rosterRaw);
    const normalizedRoster = normalizeRosterRows(parsedRoster);
    if (normalizedRoster.length === 0) {
      return sendJson(res, 200, { success: true, insertedCount: 0, customers: [] });
    }

    const supabase = getSupabase();
    const rowsForInsert = normalizedRoster.map((row) => ({
      user_id: userId,
      name: row.name,
      tags: row.tags,
    }));

    const { data: inserted, error } = await supabase
      .from('customers')
      .insert(rowsForInsert)
      .select('id, name, tags');

    if (error) throw new Error(`Supabase保存エラー: ${error.message}`);

    return sendJson(res, 200, {
      success: true,
      insertedCount: inserted?.length || 0,
      customers: inserted || [],
    });
  } catch (err) {
    console.error('upload-roster APIエラー:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
}

