/**
 * Excel 匯出模組
 * 將抓取的 FB 數據匯出為 Excel 檔案
 */
const ExcelJS = require('exceljs');
const path = require('path');

async function exportToExcel(data, outputDir) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FB Social Report Tool';
  workbook.created = new Date();

  // ===== 工作表 1：貼文數據 =====
  const ws = workbook.addWorksheet('貼文數據', {
    properties: { defaultColWidth: 18 },
  });

  // 標題列
  ws.columns = [
    { header: '序號', key: 'index', width: 8 },
    { header: '標題內容', key: 'title', width: 35 },
    { header: '素材型式', key: 'mediaType', width: 12 },
    { header: '貼文內容', key: 'message', width: 50 },
    { header: '觸及人數', key: 'reach', width: 14 },
    { header: '心情數', key: 'reactions', width: 10 },
    { header: '留言數', key: 'comments', width: 10 },
    { header: '分享次數', key: 'shares', width: 10 },
    { header: '心情、留言和分享次數', key: 'totalEngagement', width: 20 },
    { header: '互動率', key: 'engagementRate', width: 12 },
    { header: '發布時間', key: 'createdTime', width: 20 },
    { header: '貼文連結', key: 'permalink', width: 40 },
  ];

  // 標題樣式
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0057B7' },
  };
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // 填入數據
  const sortedPosts = [...data.posts].sort((a, b) => b.reach - a.reach);
  sortedPosts.forEach((post, i) => {
    ws.addRow({
      index: i + 1,
      title: post.title,
      mediaType: post.mediaType,
      message: post.message,
      reach: post.reach,
      reactions: post.reactions,
      comments: post.comments,
      shares: post.shares,
      totalEngagement: post.totalEngagement,
      engagementRate: post.engagementRate,
      createdTime: new Date(post.createdTime).toLocaleString('zh-TW'),
      permalink: post.permalink,
    });
  });

  // 互動率格式化為百分比
  ws.getColumn('engagementRate').numFmt = '0.00%';

  // 數字欄位格式
  ['reach', 'reactions', 'comments', 'shares', 'totalEngagement'].forEach(col => {
    ws.getColumn(col).numFmt = '#,##0';
    ws.getColumn(col).alignment = { horizontal: 'right' };
  });

  // ===== 工作表 2：KPI 摘要 =====
  const wsKpi = workbook.addWorksheet('KPI 摘要');

  wsKpi.columns = [
    { header: '指標', key: 'metric', width: 25 },
    { header: '數值', key: 'value', width: 20 },
  ];

  wsKpi.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsKpi.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF00A0BB' },
  };

  const kpi = {
    totalPosts: sortedPosts.length,
    followersCount: data.pageInfo.followersCount,
    totalReach: sortedPosts.reduce((sum, p) => sum + p.reach, 0),
    totalEngagement: sortedPosts.reduce((sum, p) => sum + p.totalEngagement, 0),
    avgEngagement: sortedPosts.length > 0
      ? Math.round(sortedPosts.reduce((sum, p) => sum + p.totalEngagement, 0) / sortedPosts.length)
      : 0,
  };

  wsKpi.addRow({ metric: '貼文發布總篇數', value: kpi.totalPosts });
  wsKpi.addRow({ metric: '粉專追蹤人數', value: kpi.followersCount });
  wsKpi.addRow({ metric: '累計總觸及人數', value: kpi.totalReach });
  wsKpi.addRow({ metric: '總互動次數', value: kpi.totalEngagement });
  wsKpi.addRow({ metric: '平均互動次數', value: kpi.avgEngagement });
  wsKpi.addRow({ metric: '報告期間', value: `${data.year}年${data.month}月` });
  wsKpi.addRow({ metric: '粉專名稱', value: data.pageInfo.name });

  wsKpi.getColumn('value').numFmt = '#,##0';

  // 儲存檔案
  const fileName = `${data.pageInfo.name || '粉專'}_${data.year}-${String(data.month).padStart(2, '0')}_貼文數據.xlsx`;
  const filePath = path.join(outputDir, fileName);

  await workbook.xlsx.writeFile(filePath);
  console.log(`📗 Excel 匯出完成：${filePath}`);

  return filePath;
}

module.exports = { exportToExcel };
