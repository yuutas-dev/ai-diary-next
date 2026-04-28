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

function mapEntriesToLegacyMemo(entries) {
  return (entries || []).map(entry => ({
    id: entry.id,
    date: entry.entry_date,
    text: entry.input_memo || '',
    aiGeneratedText: entry.ai_generated_text || '',
    finalSentText: entry.final_sent_text || '',
    tags: entry.input_tags || [],
    photoUrl: entry.photo_url || undefined,
    type: entry.entry_type,
    status: entry.delivery_status
  }));
}

/**
 * rows: Supabase 行のみ。一覧用クライアント形へ変換。
 * @param {*} customer DB行
 * @param { Map<string | number, any[]> } entriesByCustomerId
 * @param { Set<string> } masterIdsSet master の UUID セット
 */
function customerRowToListPayload(customer, entriesByCustomerId, masterIdsSet) {
  const mappedEntries = mapEntriesToLegacyMemo(entriesByCustomerId.get(customer.id) || []);
  const tagsJoin = normalizeTags(customer.tags).join(', ');
  const isMasterDummy =
    masterIdsSet.has(String(customer.id)) ||
    customer.is_master_dummy === true ||
    customer.is_master_dummy === 'true';
  /** DBに存在する列のみリストに載せる */
  const out = {
    id: customer.id,
    name: customer.name,
    memo: JSON.stringify(mappedEntries),
    tags: tagsJoin,
    entries: mappedEntries,
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

    /** エントリ取得用：ユーザー客とマスターをマージしない（両方独立）が ID は集合で取得 */
    const allIdsMap = new Map();
    (masterRows || []).forEach(c => allIdsMap.set(c.id, c.id));
    (userRows || []).forEach(c => allIdsMap.set(c.id, c.id));
    const unionIds = Array.from(allIdsMap.keys());

    const { data: favorites, error: favError } = await supabase
      .from('favorite_writing_samples')
      .select('source_entry_id, sample_text')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (favError) console.error('Favorites fetch error:', favError);
    const favoriteIds = favorites ? favorites.map(f => f.source_entry_id) : [];
    const favoriteTexts = favorites ? favorites.map(f => f.sample_text) : [];

    let entriesByCustomerId = new Map();
    if (unionIds.length > 0) {
      const { data: entriesData, error: entriesError } = await supabase
        .from('customer_entries')
        .select('*')
        .in('customer_id', unionIds)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true });
      if (entriesError) throw new Error('エントリ取得エラー: ' + entriesError.message);

      (entriesData || []).forEach(entry => {
        if (!entriesByCustomerId.has(entry.customer_id)) entriesByCustomerId.set(entry.customer_id, []);
        entriesByCustomerId.get(entry.customer_id).push(entry);
      });
    }

    const masterCustomers = masterRows.map(customer =>
      customerRowToListPayload(customer, entriesByCustomerId, masterIdsSet)
    );

    /** ユーザー本人のレコードのみ（マスターダミーとは ID で重複させない） */
    const userCustomers = userRows
      .filter(u => !masterIdsSet.has(String(u.id)))
      .map(customer => customerRowToListPayload(customer, entriesByCustomerId, masterIdsSet));

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
