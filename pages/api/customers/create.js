import { createClient } from '@supabase/supabase-js';
import { normalizeBusinessTypeForDb } from '../../../lib/normalizeBusinessTypeDb.js';
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
    const newName = trimText(data?.newName);
    const tagsArray = normalizeTags(data?.newTags);

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

    const biz = normalizeBusinessTypeForDb(data?.businessType ?? data?.business_type);
    /** Supabase はホワイトリストのみ（フロント専用プロパティを混入させない） */
    const payload = {
      user_id: userId,
      name: newName,
      tags: tagsArray,
    };
    if (biz) payload.business_type = biz;

    const { data: created, error } = await supabase
      .from('customers')
      .insert(payload)
      .select('id, name, tags')
      .single();

    if (error) {
      throw new Error('Supabase保存エラー: ' + error.message);
    }

    return sendJson(res, 200, {
      success: true,
      customer: {
        id: created.id,
        name: created.name,
        tags: normalizeTags(created.tags).join(', ')
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