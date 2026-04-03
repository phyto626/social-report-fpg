require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const FacebookAPI = require('./src/fb-api');
const DataAnalyzer = require('./src/data-analyzer');
const ReportGenerator = require('./src/report-generator');
const { exportToExcel } = require('./src/excel-export');
const PptxBuilder = require('./src/pptx-builder');

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

// 取得歷史報告清單 API
app.get('/api/reports', (req, res) => {
  try {
    if (!fs.existsSync(outputDir)) {
      return res.json({ reports: [] });
    }
    const files = fs.readdirSync(outputDir);
    const reports = files.filter(f => f.endsWith('.html') || f.endsWith('.xlsx'))
      .map(f => {
        const stats = fs.statSync(path.join(outputDir, f));
        return { 
          name: f, 
          url: `/output/${encodeURIComponent(f)}`, 
          time: stats.mtimeMs, 
          type: f.endsWith('.html') ? 'html' : 'excel' 
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
    const { startDate, endDate, brand } = req.body;
    
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
    const analyzer = new DataAnalyzer(rawData);
    const analysisResult = analyzer.analyze();
    
    // 將完整分析結果存入對應 Key，以便後續產出簡報
    const cacheKey = `${brandKey}_${startDate}_${endDate}`;
    reportDataCache[cacheKey] = analysisResult;

    const reportGenerator = new ReportGenerator(analysisResult);
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

    // 從記憶體中抓出剛產生的完整分析數據
    const cacheKey = `${brandKey}_${startDate}_${endDate}`;
    const analysisResult = reportDataCache[cacheKey];
    if (!analysisResult) {
      return res.status(400).json({ success: false, message: '系統查無分析數據，請重新點擊 Generate Report 抓取最新數據！' });
    }

    // 準備輸出路徑
    const templatePath = path.resolve(__dirname, 'template.pptx');
    
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
