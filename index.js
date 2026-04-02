#!/usr/bin/env node
/**
 * FB 社群成果分析報告生成工具
 * 
 * 使用方式：
 *   node index.js                    # 互動模式（會詢問月份）
 *   node index.js --month 2026-03    # 指定月份
 *   node index.js --fetch-only       # 只抓取數據（匯出 Excel）
 *   node index.js --report-only      # 從 Excel 生成報告（不呼叫 API）
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const FacebookAPI = require('./src/fb-api');
const DataAnalyzer = require('./src/data-analyzer');
const ReportGenerator = require('./src/report-generator');
const { exportToExcel } = require('./src/excel-export');

// ===== 設定 =====
const CONFIG = {
  pageId: process.env.FB_PAGE_ID,
  accessToken: process.env.FB_PAGE_ACCESS_TOKEN,
  apiVersion: process.env.FB_API_VERSION || 'v21.0',
  brandName: process.env.BRAND_NAME || '洗衣精補充站',
  outputDir: process.env.OUTPUT_DIR || './output',
  exportExcel: process.env.EXPORT_EXCEL !== 'false',
};

// ===== 主程式 =====
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   📊 FB 社群成果分析報告生成工具                  ║');
  console.log('║   Facebook Social Media Report Generator          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // 檢查必要設定
  if (!CONFIG.pageId || !CONFIG.accessToken) {
    console.error('❌ 錯誤：缺少必要設定！');
    console.error('');
    console.error('請確認 .env 檔案包含以下設定：');
    console.error('  FB_PAGE_ID=你的粉專ID');
    console.error('  FB_PAGE_ACCESS_TOKEN=你的權杖');
    console.error('');
    console.error('可參考 .env.example 範例檔案。');
    process.exit(1);
  }

  // 確保輸出目錄存在
  const outputDir = path.resolve(CONFIG.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 解析命令列參數
  const args = parseArgs();
  let year, month;

  if (args.month) {
    // 從命令列參數取得月份
    const parts = args.month.split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
  } else {
    // 互動式詢問月份
    const input = await askQuestion('📅 請輸入要分析的月份 (YYYY-MM，例如 2026-03)：');
    const parts = input.trim().split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
  }

  // 驗證月份
  if (!year || !month || month < 1 || month > 12) {
    console.error('❌ 無效的月份格式！請使用 YYYY-MM 格式。');
    process.exit(1);
  }

  console.log(`\n📅 分析期間：${year}年${month}月\n`);

  try {
    // ===== Step 1: 抓取 FB 數據 =====
    const fbApi = new FacebookAPI({
      pageId: CONFIG.pageId,
      accessToken: CONFIG.accessToken,
      apiVersion: CONFIG.apiVersion,
    });

    const rawData = await fbApi.fetchAllData(year, month);

    if (rawData.posts.length === 0) {
      console.log('\n⚠️ 該月份沒有貼文數據，無法生成報告。');
      process.exit(0);
    }

    // ===== Step 2: 匯出 Excel（可選） =====
    if (CONFIG.exportExcel && !args.reportOnly) {
      console.log('\n📗 正在匯出 Excel...');
      await exportToExcel(rawData, outputDir);
    }

    if (args.fetchOnly) {
      console.log('\n✅ 數據抓取完成（僅抓取模式）。');
      process.exit(0);
    }

    // ===== Step 3: 數據分析 =====
    console.log('\n🔍 正在分析數據...');
    const analyzer = new DataAnalyzer(rawData);
    const analysisResult = analyzer.analyze();

    // ===== Step 4: 生成 HTML 報告 =====
    console.log('📄 正在生成 HTML 報告...');
    const reportGenerator = new ReportGenerator(analysisResult);
    const html = reportGenerator.generate();

    const reportFileName = `${CONFIG.brandName}_${year}-${String(month).padStart(2, '0')}_社群成果分析報告.html`;
    const reportPath = path.join(outputDir, reportFileName);

    fs.writeFileSync(reportPath, html, 'utf-8');
    console.log(`\n✅ 報告已生成：${reportPath}`);

    // ===== 結果摘要 =====
    console.log('\n' + '='.repeat(50));
    console.log('  📊 分析結果摘要');
    console.log('='.repeat(50));
    console.log(`  粉專名稱：${rawData.pageInfo.name}`);
    console.log(`  追蹤人數：${rawData.pageInfo.followersCount.toLocaleString()}`);
    console.log(`  分析期間：${year}年${month}月`);
    console.log(`  貼文篇數：${analysisResult.kpi.totalPosts}`);
    console.log(`  總觸及數：${analysisResult.kpi.totalReach.toLocaleString()}`);
    console.log(`  平均互動：${analysisResult.kpi.avgEngagement}`);
    console.log(`  整體互動率：${(analysisResult.kpi.overallEngagementRate * 100).toFixed(2)}%`);
    console.log('='.repeat(50));
    console.log('');
    console.log('🎉 完成！可在瀏覽器中開啟報告檔案查看。');
    console.log(`📁 ${reportPath}`);

  } catch (error) {
    console.error('\n❌ 執行過程發生錯誤：');
    console.error(error.message);

    if (error.message.includes('OAuthException')) {
      console.error('\n💡 提示：權杖可能已過期，請重新產生 Page Access Token。');
      console.error('   前往：https://developers.facebook.com/tools/explorer/');
    }

    if (error.message.includes('permissions')) {
      console.error('\n💡 提示：請確認應用程式已申請以下權限：');
      console.error('   - pages_read_engagement');
      console.error('   - pages_show_list');
      console.error('   - read_insights');
    }

    process.exit(1);
  }
}

// ===== 工具函式 =====

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { month: null, fetchOnly: false, reportOnly: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--month' && args[i + 1]) {
      result.month = args[i + 1];
      i++;
    } else if (args[i] === '--fetch-only') {
      result.fetchOnly = true;
    } else if (args[i] === '--report-only') {
      result.reportOnly = true;
    }
  }

  return result;
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// ===== 啟動 =====
main().catch(err => {
  console.error('❌ 未預期的錯誤：', err);
  process.exit(1);
});
