import { createClient } from '@supabase/supabase-js';
import { requireResolvedUserId } from '../../../lib/validateUserId.js';

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

/** rows: フォーマット処理（entriesはDBから引数として受け取る） */
function customerRowToListPayload(customer, masterIdsSet, customerEntriesMap) {
  const tagsJoin = normalizeTags(customer.tags).join(', ');
  const isMasterDummy =
    masterIdsSet.has(String(customer.id)) ||
    customer.is_master_dummy === true ||
    customer.is_master_dummy === 'true';

  // マップからこの顧客の履歴（customer_entries）を取得
  const rawEntries = customerEntriesMap.get(customer.id) || [];
  const canonicalEntries = rawEntries.map((m) => ({
    id: m.id,
    date: m.entry_date || '',
    text: m.input_memo || '',
    aiGeneratedText: m.ai_generated_text || '',
    finalSentText: m.final_sent_text || '',
    tags: normalizeTags(m.input_tags),
    photoUrl: m.photo_url || undefined,
    type: m.entry_type || 'visit',
    status: m.delivery_status || ''
  }));

  // memoは純粋な静的文字列（全体メモ）として扱う。
  // ※レガシーデータで配列のJSON文字列 `[{"id"...}]` が残っていた場合は弾く
  let staticMemo = '';
  if (typeof customer.memo === 'string') {
     const trimmed = customer.memo.trim();
     if (!trimmed.startsWith('[')) {
         staticMemo = trimmed;
     }
  }

  const out = {
    id: customer.id,
    name: customer.name,
    memo: staticMemo,
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

    // 1. ダミー顧客の取得
    const masterResult = await supabase.from('customers').select('*').eq('is_master_dummy', true);
    let masterRows = [];
    if (masterResult.error) {
      console.warn('[customers/list] is_master_dummy 取得フォールバック:', masterResult.error.message);
      const legacy = await supabase.from('customers').select('*').contains('tags', ['ダミー']);
      if (!legacy.error) masterRows = (legacy.data || []).filter(c => normalizeTags(c.tags).includes('ダミー'));
    } else {
      masterRows = masterResult.data || [];
    }

    // 2. ユーザー顧客の取得
    const userRowsResult = await supabase.from('customers').select('*').eq('user_id', userId);
    if (userRowsResult.error) throw new Error('Supabaseユーザーデータ取得エラー: ' + userRowsResult.error.message);
    const userRows = userRowsResult.data || [];

    // 3. 【NEW】customer_entries（イベントログ）の一括取得
    const entriesResult = await supabase
      .from('customer_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (entriesResult.error) throw new Error('履歴データ取得エラー: ' + entriesResult.error.message);

    // 取得した履歴を customer_id ごとにグループ化する
    const customerEntriesMap = new Map();
    for (const entry of (entriesResult.data || [])) {
      if (!customerEntriesMap.has(entry.customer_id)) {
        customerEntriesMap.set(entry.customer_id, []);
      }
      customerEntriesMap.get(entry.customer_id).push(entry);
    }

    const masterIdsSet = new Set((masterRows || []).map(c => String(c.id)));

    // 4. お気に入りの取得
    const { data: favorites, error: favError } = await supabase
      .from('favorite_writing_samples')
      .select('source_entry_id, sample_text')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (favError) console.error('Favorites fetch error:', favError);
    const favoriteIds = favorites ? favorites.map(f => f.source_entry_id) : [];
    const favoriteTexts = favorites ? favorites.map(f => f.sample_text) : [];

    const userIdSetForDedupe = new Set((userRows || []).map(u => String(u.id)));
    const masterCustomers = (masterRows || [])
      .filter(m => !userIdSetForDedupe.has(String(m.id)))
      .map(customer => customerRowToListPayload(customer, masterIdsSet, customerEntriesMap));

    const userCustomers = userRows.map(customer =>
      customerRowToListPayload(customer, masterIdsSet, customerEntriesMap)
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
