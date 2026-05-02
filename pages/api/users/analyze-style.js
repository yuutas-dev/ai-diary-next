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

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });

  try {
    const data = parseRequestBody(req.body);
    const userId = requireResolvedUserId(data?.userId, res);
    if (!userId) return;

    const pastLineText = (data?.pastLineText || '').trim();
    if (!pastLineText) {
      return sendJson(res, 400, { success: false, error: '過去のLINE文章が入力されていません' });
    }

    const difyAnalyzeKey = (process.env.DIFY_ANALYZE_API_KEY || '').trim();
    if (!difyAnalyzeKey) {
      throw new Error('分析用DifyのAPIキーが設定されていません');
    }

    const difyBase = (process.env.DIFY_API_URL || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1').replace(/\/$/, '');

    // 1. Difyに分析をリクエスト
    // まずワークフローを試し、404/405などの失敗時はテキストジェネレーターAPIへフォールバックする。
    const authHeaders = {
      'Authorization': `Bearer ${difyAnalyzeKey}`,
      'Content-Type': 'application/json',
    };
    const workflowBody = {
      inputs: { past_line_text: pastLineText },
      response_mode: 'blocking',
      user: userId,
    };
    const completionBody = {
      inputs: { past_line_text: pastLineText },
      query: pastLineText,
      response_mode: 'blocking',
      user: userId,
    };

    let difyRes = await fetch(`${difyBase}/workflows/run`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(workflowBody),
    });
    let difyData = null;

    if (difyRes.ok) {
      difyData = await difyRes.json();
    } else {
      const workflowStatus = difyRes.status;
      const workflowErrText = await difyRes.text().catch(() => '');
      console.error('Dify workflow API failed, fallback to completion-messages', {
        status: workflowStatus,
        statusText: difyRes.statusText,
        body: workflowErrText,
      });

      difyRes = await fetch(`${difyBase}/completion-messages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(completionBody),
      });

      if (!difyRes.ok) {
        const completionErrText = await difyRes.text().catch(() => '');
        throw new Error(
          `Dify分析エラー: workflow=${workflowStatus} ${workflowErrText} ` +
          `completion=${difyRes.status} ${completionErrText || workflowErrText}`,
        );
      }
      difyData = await difyRes.json();
    }
    
    // Difyの出力から生成されたプロンプトを抽出
    const analyzedPrompt = 
      difyData?.data?.outputs?.text || 
      difyData?.data?.outputs?.answer || 
      difyData?.answer || 
      '';

    if (!analyzedPrompt.trim()) {
      throw new Error('ルールの抽出に失敗しました（AIの回答が空です）');
    }

    // 2. Supabase の user_profiles に保存
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ai_custom_prompt: analyzedPrompt.trim(),
        base_style_text: pastLineText,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (dbError) {
      console.error('Supabase upsert error on user_profiles', {
        code: dbError.code || null,
        message: dbError.message || '',
        details: dbError.details || null,
        hint: dbError.hint || null,
      });
      return sendJson(res, 500, {
        success: false,
        error: 'DB保存エラー',
        dbError: {
          code: dbError.code || null,
          message: dbError.message || 'unknown db error',
          details: dbError.details || null,
          hint: dbError.hint || null,
        },
      });
    }

    return sendJson(res, 200, { success: true, customPrompt: analyzedPrompt.trim() });

  } catch (err) {
    console.error('分析APIエラー:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
}
