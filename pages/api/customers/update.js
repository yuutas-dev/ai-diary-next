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
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string' && tags.trim()) {
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function trimText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    const data = parseRequestBody(req.body);
    const userId = requireResolvedUserId(data?.userId, res);
    if (!userId) return;
    const customerId = trimText(data?.customerId);
    const newName = trimText(data?.newName);
    const tagsArray = normalizeTags(data?.newTags);

    if (!customerId) {
      return sendJson(res, 400, {
        success: false,
        error: 'customerId is required'
      });
    }

    if (!newName) {
      return sendJson(res, 400, {
        success: false,
        error: 'newName is required'
      });
    }

    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Vercelの環境変数が読み込めていません');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: preCustomer, error: preErr } = await supabase
      .from('customers')
      .select('id, is_master_dummy')
      .eq('user_id', userId)
      .eq('id', customerId)
      .maybeSingle();

    if (preErr || !preCustomer) {
      return sendJson(res, 404, {
        success: false,
        error: '対象顧客が見つかりません'
      });
    }

    if (preCustomer.is_master_dummy === true) {
      return sendJson(res, 403, {
        success: false,
        error: 'サンプル顧客は編集できません'
      });
    }

    const { data: updatedRows, error } = await supabase
      .from('customers')
      .update({
        name: newName,
        tags: tagsArray,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', customerId)
      .select('id, name, tags');

    if (error) {
      throw new Error('Supabase更新エラー: ' + error.message);
    }

    const updated = Array.isArray(updatedRows) ? updatedRows[0] : null;

    if (!updated) {
      return sendJson(res, 404, {
        success: false,
        error: '対象顧客が見つかりません'
      });
    }

    return sendJson(res, 200, {
      success: true,
      customer: {
        id: updated.id,
        name: updated.name,
        tags: normalizeTags(updated.tags).join(', ')
      }
    });
  } catch (err) {
    console.error('バックエンド処理エラー:', err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
}
