/**
 * 內容特徵洞察分析模組 — 串接 Gemini AI
 *
 * 功能：
 *  1. 依互動率將貼文分為高表現（前 1/3）與低表現（其餘）兩群
 *  2. 依品牌選擇對應 Prompt（台塑便利家 / ECOCO）
 *  3. 呼叫 Gemini API 歸納 4 個內容特徵洞察（含 actionTips）
 *  4. 解析 JSON 回傳結構化結果
 */
const axios = require('axios');

const MODEL = 'gemini-3.1-flash-lite-preview';

// ───── 貼文格式化 ─────

/**
 * 將貼文陣列格式化為 Prompt 可讀的文字區塊
 * @param {Array} posts
 * @returns {string}
 */
function buildPostBlock(posts) {
  if (!posts || posts.length === 0) return '（無貼文）';

  return posts.map((p, i) => {
    const ratePct = (p.engagementRate * 100).toFixed(1);
    const msgPreview = (p.message || '（無文字內容）')
      .substring(0, 180)
      .replace(/\n+/g, ' ');
    return `--- 貼文 ${i + 1}｜ID: ${p.id}｜互動率 ${ratePct}%｜素材：${p.mediaType} ---\n標題：${p.title}\n${msgPreview}`;
  }).join('\n\n');
}

// ───── 品牌專屬 Prompt ─────

/**
 * 台塑便利家 Prompt
 */
function getFpgPrompt(highPosts, lowPosts) {
  const highBlock = buildPostBlock(highPosts);
  const lowBlock  = buildPostBlock(lowPosts);

  return `你是一位台灣社群媒體策略顧問，專門分析 Facebook 貼文表現。

品牌：台塑便利家（環保洗劑補充站）

【高表現貼文】互動率前 1/3，共 ${highPosts.length} 篇：

${highBlock}

【低表現貼文】其餘 ${lowPosts.length} 篇：

${lowBlock}

---

請比較高低表現兩群，歸納出 4 個讓高表現貼文脫穎而出的內容特徵。

輸出格式（JSON，不要加任何說明文字）：
{
  "insights": [
    {
      "id": "英文 ID",
      "emoji": "代表 emoji",
      "label": "特徵名稱（6字以內）",
      "title": "這個特徵的一句話結論（15字以內）",
      "actionTips": [
        "具體做法第一點",
        "具體做法第二點",
        "具體做法第三點"
      ],
      "samplePostIds": ["高表現群的貼文 ID（從上方清單的 ID 欄位挑選）"],
      "isNew": false
    }
  ]
}

規則：
- 必須輸出剛好 4 個 insight
- 4 個特徵必須真實反映高低群差異，不要憑空發明
- actionTips 每點一行，15 字以內，動詞開頭，具體到小編明天就能執行
- 前 3 個 isNew 為 false，第 4 個若本月特別突出則標 true，否則也為 false
- samplePostIds 只填高表現群的貼文 ID，最多 2 個
- 全部繁體中文
- 只輸出 JSON`;
}

/**
 * ECOCO Prompt
 */
function getEcocoPrompt(highPosts, lowPosts) {
  const highBlock = buildPostBlock(highPosts);
  const lowBlock  = buildPostBlock(lowPosts);

  return `你是一位台灣社群媒體策略顧問，專門分析 Facebook 貼文表現。

品牌背景：ECOCO 是智慧回收機台品牌，用戶透過 APP 將空瓶、廢電池、手機等投入實體機台換取點數，點數可折抵消費或兌換禮品。主要受眾為關注環保議題的家庭、學生、上班族，也有大量親子共同參與的族群。貼文風格兼顧環保倡議、APP 使用教學、社區活動，語氣上介於公益感與趣味感之間。

【高表現貼文】本月互動率前 1/3，共 ${highPosts.length} 篇：

${highBlock}

【低表現貼文】本月其餘貼文，共 ${lowPosts.length} 篇：

${lowBlock}

請仔細比較兩群貼文，找出讓高表現貼文脫穎而出的真實原因。
分析時請特別關注：
- 是否帶入具體的回收情境或生活場景
- 點數、獎勵、活動等誘因的呈現方式
- 環保倡議的力道（說教感 vs 共鳴感）
- APP 操作教學的易懂程度與視覺引導
- 親子或社區參與感的營造方式
- 機台位置、滿桶、新站等實用資訊的處理

輸出格式（純 JSON，不要加任何說明或代碼框）：
{
  "insights": [
    {
      "id": "英文 ID（如 scene、reward、empathy、education）",
      "emoji": "代表 emoji",
      "label": "特徵名稱（6字以內）",
      "title": "這個特徵的一句話結論（18字以內，動詞開頭）",
      "actionTips": [
        "具體做法，動詞開頭，15字以內",
        "具體做法，動詞開頭，15字以內",
        "具體做法，動詞開頭，15字以內"
      ],
      "samplePostIds": ["高表現群的貼文 ID，最多 2 個"]
    }
  ]
}

規則：
- 必須輸出剛好 4 個 insight
- 每個 insight 的 title 必須是本月數據的真實反映，不要泛泛而談
- actionTips 要具體到小編明天就能執行，例如「在第一行寫出回收物品名稱」而不是「多寫環保相關內容」
- samplePostIds 只填高表現群的貼文 ID，最多 2 個
- 全部繁體中文
- 只輸出 JSON`;
}

// ───── Gemini API 呼叫 ─────

/**
 * 呼叫 Gemini API 分析內容特徵
 * @param {string} prompt
 * @param {string} geminiApiKey
 * @returns {Promise<object|null>}
 */
async function callGeminiInsightAnalysis(prompt, geminiApiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`;

  try {
    const response = await axios.post(endpoint, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 提取 JSON（可能被 ```json ``` 包裹）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[InsightAnalyzer] 無法從 Gemini 回應提取 JSON:', raw.substring(0, 300));
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[InsightAnalyzer] Gemini API 呼叫失敗:', err.message);
    if (err.response?.data) {
      console.error('[InsightAnalyzer] 回應內容:', JSON.stringify(err.response.data).substring(0, 500));
    }
    return null;
  }
}

// ───── 主流程 ─────

/**
 * 分析貼文內容特徵洞察（AI 版）
 * @param {Array}  posts     - 所有解析後的貼文
 * @param {string} brandName - 品牌名稱
 * @param {string} brandKey  - 品牌 key（fpg / ecoco）
 * @param {object} options   - { geminiApiKey }
 * @returns {Promise<object|null>} 結構化洞察，或 null（貼文不足 / API 失敗）
 */
async function analyzeInsights(posts, brandName, brandKey, options = {}) {
  const { geminiApiKey } = options;

  if (!geminiApiKey) {
    console.log('[InsightAnalyzer] 未設定 GEMINI_API_KEY，跳過 AI 內容特徵分析。');
    return null;
  }

  if (!posts || posts.length < 3) {
    console.log('[InsightAnalyzer] 貼文數量不足 3 篇，跳過 AI 內容特徵分析。');
    return null;
  }

  // 依互動率排序，取前 1/3 為高表現群
  const sorted    = [...posts].sort((a, b) => b.engagementRate - a.engagementRate);
  const topCount  = Math.max(1, Math.ceil(sorted.length / 3));
  const highPosts = sorted.slice(0, topCount);
  const lowPosts  = sorted.slice(topCount);

  const isEcoco = (brandKey || '').toLowerCase() === 'ecoco';
  const prompt  = isEcoco
    ? getEcocoPrompt(highPosts, lowPosts)
    : getFpgPrompt(highPosts, lowPosts);

  console.log(`[InsightAnalyzer] 正在呼叫 Gemini 分析內容特徵（高表現 ${highPosts.length} 篇 / 低表現 ${lowPosts.length} 篇）...`);

  const result = await callGeminiInsightAnalysis(prompt, geminiApiKey);

  if (!result || !Array.isArray(result.insights) || result.insights.length === 0) {
    console.log('[InsightAnalyzer] AI 回傳格式不符或失敗，將使用靜態分析。');
    return null;
  }

  // 確保最多 4 個
  const insights = result.insights.slice(0, 4);
  console.log(`[InsightAnalyzer] ✅ 成功取得 ${insights.length} 個 AI 洞察特徵`);

  return {
    source: 'gemini',
    insights,
  };
}

module.exports = { analyzeInsights };
