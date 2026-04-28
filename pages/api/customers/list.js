import { createClient } from '@supabase/supabase-js';
import { requireResolvedUserId } from '../../../lib/validateUserId.js';

/** Data route: always run on request; avoid stale caches for Supabase-backed list payloads. */
export const dynamic = 'force-dynamic';

function sendJson(res, status, payload) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.setHeader('Vary', 'Cookie');
  return res.status(status).json(payload);
}

function parseRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean);
  if (typeof tags === 'string' && tags.trim()) return tags.split(',').map(tag => tag.trim()).filter(Boolean);
  return [];
}

function getSupabase() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !supabaseKey) throw new Error('Vercelの環境変数が読み込めていません');
  return createClient(supabaseUrl, supabaseKey);
}

/** HTTP 載せ用メモ JSON 文字列（customers.memo をそのまま扱う。空は []） */
function memoStringForPayload(memo) {
  if (memo == null || memo === '') return '[]';
  if (typeof memo === 'string') return memo.trim() === '' ? '[]' : memo;
  return JSON.stringify(memo);
}

/** エピソード一覧は customers.memo のみから組み立てる（customer_entries は参照しない） */
function entriesFromCustomersMemoOnly(memo) {
  if (memo == null) return [];
  let arr;
  if (Array.isArray(memo)) {
    arr = memo;
  } else if (typeof memo === 'string' && memo.trim()) {
    try {
      const parsed = JSON.parse(memo);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  return arr.map((m) => ({
    id: m.id,
    date: m.date ?? m.entry_date ?? '',
    text: m.text ?? m.input_memo ?? m.inputMemo ?? '',
    aiGeneratedText: m.ai_generated_text ?? m.aiGeneratedText ?? '',
    finalSentText: m.final_sent_text ?? m.finalSentText ?? '',
    tags: Array.isArray(m.tags) ? m.tags : (m.input_tags ?? []),
    photoUrl: m.photo_url ?? m.photoUrl ?? undefined,
    type: m.type ?? m.entry_type ?? 'visit',
    status: m.status ?? m.delivery_status ?? ''
  }));
}

/** rows: Supabase customers 行のみ。memo / entries は customers.memo が唯一のソース */
function customerRowToListPayload(customer, masterIdsSet) {
  const memoStr = memoStringForPayload(customer.memo);
  const canonicalEntries = entriesFromCustomersMemoOnly(customer.memo);
  const tagsJoin = normalizeTags(customer.tags).join(', ');
  const isMasterDummy =
    masterIdsSet.has(String(customer.id)) ||
    customer.is_master_dummy === true ||
    customer.is_master_dummy === 'true';
  const out = {
    id: customer.id,
    name: customer.name,
    memo: memoStr,
    tags: tagsJoin,
    entries: canonicalEntries,
    is_master_dummy: isMasterDummy
  };
  if (customer.business_type != null && String(customer.business_type).trim()) {
    out.business_type = String(customer.business_type).trim();
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });

  try {
    const data = parseRequestBody(req.body);
    const userId = requireResolvedUserId(data?.userId, res);
    if (!userId) return;
    const supabase = getSupabase();

    const masterResult = await supabase.from('customers').select('*').eq('is_master_dummy', true);

    let masterRows = [];
    if (masterResult.error) {
      console.warn('[customers/list] is_master_dummy 取得フォールバック:', masterResult.error.message);
      const legacy = await supabase.from('customers').select('*').contains('tags', ['ダミー']);
      if (!legacy.error) masterRows = (legacy.data || []).filter(c => normalizeTags(c.tags).includes('ダミー'));
    } else {
      masterRows = masterResult.data || [];
    }

    const userRowsResult = await supabase.from('customers').select('*').eq('user_id', userId);
    if (userRowsResult.error) throw new Error('Supabaseユーザーデータ取得エラー: ' + userRowsResult.error.message);

    const userRows = userRowsResult.data || [];
    const masterIdsSet = new Set((masterRows || []).map(c => String(c.id)));

    const { data: favorites, error: favError } = await supabase
      .from('favorite_writing_samples')
      .select('source_entry_id, sample_text')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (favError) console.error('Favorites fetch error:', favError);
    const favoriteIds = favorites ? favorites.map(f => f.source_entry_id) : [];
    const favoriteTexts = favorites ? favorites.map(f => f.sample_text) : [];

    /** 一覧は user が優先（レガシー取得でユーザー行が masters に混入してもユーザー側だけ残す） */
    const userIdSetForDedupe = new Set((userRows || []).map(u => String(u.id)));
    const masterCustomers = (masterRows || [])
      .filter(m => !userIdSetForDedupe.has(String(m.id)))
      .map(customer => customerRowToListPayload(customer, masterIdsSet));

    const userCustomers = userRows.map(customer =>
      customerRowToListPayload(customer, masterIdsSet)
    );

    return sendJson(res, 200, {
      success: true,
      userCustomers,
      masterCustomers,
      favoriteIds,
      favoriteTexts
    });
  } catch (err) {
    console.error('バックエンド処理エラー:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
}

handler.__nextApiHandler = true;
