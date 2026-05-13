require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const FacebookAPI = require('./src/fb-api');
const DataAnalyzer = require('./src/data-analyzer');
const ReportGenerator = require('./src/report-generator');
const { exportToExcel } = require('./src/excel-export');
const PptxBuilder = require('./src/pptx-builder');
const { analyzeComments } = require('./src/comment-analyzer');
const { analyzeInsights } = require('./src/insight-analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON requests
app.use(express.json());

// 確保 output 目錄存在
const outputDir = path.resolve(__dirname, process.env.OUTPUT_DIR || './output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 供靜態讀取報告與前端檔案用
app.use('/output', express.static(outputDir));
app.use(express.static(path.join(__dirname, 'public')));

function analysisCacheFilePath(brandKey, startDate, endDate) {
  const safeKey = String(brandKey).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return path.join(outputDir, `${safeKey}_${startDate}_${endDate}_analysis.json`);
}

function loadAnalysisFromDisk(brandKey, startDate, endDate) {
  const fp = analysisCacheFilePath(brandKey, startDate, endDate);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[Cache] 讀取分析 JSON 失敗:', fp, e.message);
    return null;
  }
}

// ===== 品牌設定對照 =====
const BRANDS = {
  fpg: {
    key: 'fpg',
    name: '台塑便利家',
    pageId: process.env.FPG_PAGE_ID || process.env.FB_PAGE_ID,
    accessToken: process.env.FPG_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN,
  },
  ecoco: {
    key: 'ecoco',
    name: 'ECOCO',
    pageId: process.env.ECOCO_PAGE_ID || process.env.FB_PAGE_ID,
    accessToken: process.env.ECOCO_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN,
  },
};

// 取得可用品牌清單 API
app.get('/api/brands', (req, res) => {
  const available = Object.values(BRANDS)
    .filter(b => b.pageId && b.accessToken)
    .map(b => ({ key: b.key, name: b.name }));
  res.json({ brands: available });
});

function parseReportFilenameMeta(filename) {
  const m = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})_/);
  if (!m) return null;
  return { brandLabel: m[1], startDate: m[2], endDate: m[3] };
}

// 取得歷史報告清單 API
app.get('/api/reports', (req, res) => {
  try {
    if (!fs.existsSync(outputDir)) {
      return res.json({ reports: [] });
    }
    const files = fs.readdirSync(outputDir);
    const reports = files
      .filter(f => {
        if (f.endsWith('_analysis.json')) return false;
        return f.endsWith('.html') || f.endsWith('.xlsx') || f.endsWith('.pptx');
      })
      .map(f => {
        const stats = fs.statSync(path.join(outputDir, f));
        let type = 'html';
        if (f.endsWith('.xlsx')) type = 'excel';
        else if (f.endsWith('.pptx')) type = 'pptx';
        const meta = parseReportFilenameMeta(f);
        return {
          name: f,
          url: `/output/${encodeURIComponent(f)}`,
          time: stats.mtimeMs,
          type,
          ...(meta || {}),
        };
      })
      .sort((a, b) => b.time - a.time);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cache for generated reports data so PPTX can access full data without re-fetching
const reportDataCache = {};

app.post('/api/generate', async (req, res) => {
  try {
    const { startDate, endDate, brand, selectedSections } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '請提供起始與結束日期' });
    }

    // 取得品牌設定
    const brandKey = (brand || 'fpg').toLowerCase();
    const brandConfig = BRANDS[brandKey];
    if (!brandConfig || !brandConfig.pageId || !brandConfig.accessToken) {
      return res.status(400).json({ success: false, message: `品牌 "${brand}" 設定不完整或不存在。請檢查 .env 設定。` });
    }

    console.log(`[Web API] 品牌：${brandConfig.name} | 開始抓取 ${startDate} ~ ${endDate} 數據...`);

    const fbApi = new FacebookAPI({
      pageId: brandConfig.pageId,
      accessToken: brandConfig.accessToken,
      apiVersion: process.env.FB_API_VERSION || 'v21.0',
    });

    const rawData = await fbApi.fetchAllData(startDate, endDate);
    if (rawData.pageInfo) rawData.pageInfo.name = brandConfig.name;

    if (rawData.posts.length === 0) {
      return res.json({ success: false, message: '該期間沒有貼文數據，無法生成報告。' });
    }

    // 匯出 Excel
    const exportExcelSetting = process.env.EXPORT_EXCEL !== 'false';
    let excelName = '';
    if (exportExcelSetting) {
      const excelPath = await exportToExcel(rawData, outputDir);
      excelName = path.basename(excelPath);
    }

    // 數據分析與 HTML 生成
    const analyzer = new DataAnalyzer(rawData, brandKey);
    const analysisResult = analyzer.analyze();
    
    // 將完整分析結果存入對應 Key，以便後續產出簡報
    const cacheKey = `${brandKey}_${startDate}_${endDate}`;
    reportDataCache[cacheKey] = analysisResult;

    // AI 留言分析（Gemini）
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      console.log('[Web API] 正在進行 AI 留言分析...');
      const commentInsights = await analyzeComments(
        analysisResult.posts,
        brandConfig.name,
        { geminiApiKey }
      );
      analysisResult.commentInsights = commentInsights;
    } else {
      console.log('[Web API] 未設定 GEMINI_API_KEY，跳過 AI 留言分析。');
      analysisResult.commentInsights = null;
    }

    // AI 內容特徵分析（Gemini）
    if (geminiApiKey) {
      console.log('[Web API] 正在進行 AI 內容特徵分析...');
      const aiInsights = await analyzeInsights(
        analysisResult.posts,
        brandConfig.name,
        brandKey,
        { geminiApiKey }
      );
      analysisResult.aiInsights = aiInsights;
    } else {
      analysisResult.aiInsights = null;
    }

    try {
      fs.writeFileSync(
        analysisCacheFilePath(brandKey, startDate, endDate),
        JSON.stringify(analysisResult),
        'utf-8'
      );
    } catch (e) {
      console.error('[Web API] 寫入分析快取檔失敗:', e.message);
    }

    const reportGenerator = new ReportGenerator(analysisResult, selectedSections);
    const html = reportGenerator.generate();

    const brandName = brandConfig.name;
    const reportFileName = `${brandName}_${startDate}_to_${endDate}_社群成果分析報告.html`;
    const reportPath = path.join(outputDir, reportFileName);

    fs.writeFileSync(reportPath, html, 'utf-8');
    
    console.log(`[Web API] 報告生成成功：${reportFileName}`);

    res.json({
      success: true,
      reportUrl: `/output/${encodeURIComponent(reportFileName)}`,
      excelUrl: excelName ? `/output/${encodeURIComponent(excelName)}` : null,
      kpi: analysisResult.kpi,
      brandName,
    });
    
  } catch (err) {
    console.error('[Web API] 發生錯誤:', err);
    let errorMessage = err.message;
    if (err.message.includes('OAuthException')) {
      errorMessage = 'Token 無效或已過期，請至 Meta Developer 重新產生。';
    }
    res.status(500).json({ success: false, message: errorMessage });
  }
});

app.post('/api/generate-pptx', async (req, res) => {
  try {
    const { startDate, endDate, brand } = req.body;
    if (!startDate || !endDate || !brand) {
      return res.status(400).json({ success: false, message: '參數不齊全' });
    }

    const brandKey = brand.toLowerCase();
    const brandConfig = BRANDS[brandKey];
    if (!brandConfig) {
      return res.status(400).json({ success: false, message: '無效的品牌' });
    }

    const cacheKey = `${brandKey}_${startDate}_${endDate}`;
    let analysisResult = reportDataCache[cacheKey];
    if (!analysisResult) {
      analysisResult = loadAnalysisFromDisk(brandKey, startDate, endDate);
      if (analysisResult) {
        reportDataCache[cacheKey] = analysisResult;
      }
    }
    if (!analysisResult) {
      return res.status(400).json({
        success: false,
        message: '查無此期間的分析資料。請先按「產生報告」成功一次，或確認 output 資料夾內是否有對應的分析快取檔。',
      });
    }

    const pptxName = `${brandConfig.name}_${startDate}_to_${endDate}_簡報報告.pptx`;
    const outputPath = path.join(outputDir, pptxName);

    const builder = new PptxBuilder();
    await builder.generate(analysisResult, outputPath);

    res.json({
      success: true,
      pptxUrl: `/output/${encodeURIComponent(pptxName)}`
    });

  } catch (err) {
    console.error('[PPTX API] 發生錯誤:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== 趨勢總覽 API：近 N 個月真實數據 =====
app.get('/api/trends', async (req, res) => {
  try {
    const monthCount = parseInt(req.query.months) || 6;
    const now = new Date();
    const months = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
      });
    }

    const result = { months: months.map(m => m.label), brands: {} };

    // 逐品牌逐月抓取
    for (const [bKey, bCfg] of Object.entries(BRANDS)) {
      if (!bCfg.pageId || !bCfg.accessToken) {
        // 品牌未設定，回傳空資料
        result.brands[bKey] = {
          name: bCfg.name,
          reach: months.map(() => 0),
          engagement: months.map(() => 0),
        };
        continue;
      }

      const fbApi = new FacebookAPI({
        pageId: bCfg.pageId,
        accessToken: bCfg.accessToken,
        apiVersion: process.env.FB_API_VERSION || 'v21.0',
      });

      const reachArr = [];
      const engArr = [];

      for (const m of months) {
        // 先檢查磁碟快取
        const cached = loadAnalysisFromDisk(bKey, m.start, m.end);
        if (cached && cached.kpi) {
          reachArr.push(cached.kpi.totalReach || 0);
          const rate = cached.kpi.totalReach > 0
            ? ((cached.kpi.totalEngagement / cached.kpi.totalReach) * 100)
            : 0;
          engArr.push(parseFloat(rate.toFixed(1)));
          console.log(`[Trends] ${bCfg.name} ${m.label} → 使用快取 (reach: ${cached.kpi.totalReach})`);
          continue;
        }

        // 快取不存在，呼叫 Meta Graph API 即時抓取
        try {
          console.log(`[Trends] ${bCfg.name} ${m.label} → 從 Meta API 抓取...`);
          const rawData = await fbApi.fetchAllData(m.start, m.end);
          if (rawData.pageInfo) rawData.pageInfo.name = bCfg.name;

          const analyzer = new DataAnalyzer(rawData, bKey);
          const analysis = analyzer.analyze();

          // 寫入快取供下次使用
          try {
            fs.writeFileSync(
              analysisCacheFilePath(bKey, m.start, m.end),
              JSON.stringify(analysis),
              'utf-8'
            );
          } catch (e) {
            console.error('[Trends] 寫入快取失敗:', e.message);
          }

          reachArr.push(analysis.kpi.totalReach || 0);
          const rate = analysis.kpi.totalReach > 0
            ? ((analysis.kpi.totalEngagement / analysis.kpi.totalReach) * 100)
            : 0;
          engArr.push(parseFloat(rate.toFixed(1)));
        } catch (apiErr) {
          console.error(`[Trends] ${bCfg.name} ${m.label} API 錯誤:`, apiErr.message);
          reachArr.push(0);
          engArr.push(0);
        }
      }

      result.brands[bKey] = {
        name: bCfg.name,
        reach: reachArr,
        engagement: engArr,
      };
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Trends API] 錯誤:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🌐 Web Server 啟動成功！`);
  console.log(`🚀 請在瀏覽器開啟: http://localhost:${PORT}`);
  console.log('='.repeat(50));
  // 顯示已偵測到的品牌
  Object.values(BRANDS).forEach(b => {
    const status = (b.pageId && b.accessToken) ? '✅ 已設定' : '❌ 未設定';
    console.log(`  ${status} ${b.name}`);
  });
  console.log('='.repeat(50));
});
