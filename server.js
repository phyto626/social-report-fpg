require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const FacebookAPI = require('./src/fb-api');
const DataAnalyzer = require('./src/data-analyzer');
const ReportGenerator = require('./src/report-generator');
const { exportToExcel } = require('./src/excel-export');

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

app.post('/api/generate', async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({ success: false, message: '請提供年份與月份' });
    }

    const nYear = parseInt(year);
    const nMonth = parseInt(month);

    console.log(`[Web API] 開始抓取 ${nYear}年${nMonth}月 數據...`);

    const fbApi = new FacebookAPI({
      pageId: process.env.FB_PAGE_ID,
      accessToken: process.env.FB_PAGE_ACCESS_TOKEN,
      apiVersion: process.env.FB_API_VERSION || 'v21.0',
    });

    const rawData = await fbApi.fetchAllData(nYear, nMonth);

    if (rawData.posts.length === 0) {
      return res.json({ success: false, message: '該月份沒有貼文數據，無法生成報告。' });
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
    const reportGenerator = new ReportGenerator(analysisResult);
    const html = reportGenerator.generate();

    const brandName = process.env.BRAND_NAME || '洗衣精補充站';
    const reportFileName = `${brandName}_${nYear}-${String(nMonth).padStart(2, '0')}_社群成果分析報告.html`;
    const reportPath = path.join(outputDir, reportFileName);

    fs.writeFileSync(reportPath, html, 'utf-8');
    
    console.log(`[Web API] 報告生成成功：${reportFileName}`);

    res.json({
      success: true,
      reportUrl: `/output/${encodeURIComponent(reportFileName)}`,
      excelUrl: excelName ? `/output/${encodeURIComponent(excelName)}` : null,
      kpi: analysisResult.kpi,
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

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🌐 Web Server 啟動成功！`);
  console.log(`🚀 請在瀏覽器開啟: http://localhost:${PORT}`);
  console.log('='.repeat(50));
});
