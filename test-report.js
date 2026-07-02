/**
 * 測試腳本：使用模擬數據生成報告
 * 驗證分析邏輯和 HTML 報告是否能正確產出
 */
const fs = require('fs');
const path = require('path');
const DataAnalyzer = require('./src/data-analyzer');
const ReportGenerator = require('./src/report-generator');

// 模擬數據
const mockData = {
  pageInfo: {
    name: '洗衣精補充站',
    followersCount: 8520,
    about: '環保洗衣新選擇',
    category: '零售',
  },
  posts: [
    { id: '1', title: '#環保洗衣 #減塑生活', message: '🌿 每一次補充，都是對地球的溫柔！\n\n你知道嗎？每使用一次補充包，就能減少 80% 的塑膠用量。來我們的補充站，一起為地球盡一份心力！\n\n#環保洗衣 #減塑生活 #洗衣精補充站', mediaType: '照片', reach: 5200, reactions: 180, comments: 45, shares: 32, totalEngagement: 257, engagementRate: 257/5200, createdTime: '2026-03-05T10:30:00+08:00', permalink: 'https://facebook.com/post/1', picture: '' },
    { id: '2', title: '#春季優惠 #限時特價', message: '🌸 春季大回饋！\n\n本週末全品項 85 折！帶自己的容器來補充，再享額外 5% 折扣。\n\n活動期間：3/8-3/10\n\n#春季優惠 #限時特價', mediaType: '照片', reach: 8900, reactions: 320, comments: 89, shares: 156, totalEngagement: 565, engagementRate: 565/8900, createdTime: '2026-03-07T14:00:00+08:00', permalink: 'https://facebook.com/post/2', picture: '' },
    { id: '3', title: '洗衣小知識分享', message: '📚 洗衣小知識 EP.3\n\n很多人不知道，洗衣精其實不是加越多越乾淨！過量的洗衣精反而會殘留在衣物纖維中，造成皮膚過敏。\n\n正確用量：每次約 30ml 就夠了！', mediaType: '影片', reach: 12500, reactions: 450, comments: 128, shares: 234, totalEngagement: 812, engagementRate: 812/12500, createdTime: '2026-03-10T19:00:00+08:00', permalink: 'https://facebook.com/post/3', picture: '' },
    { id: '4', title: '#客戶回饋 #真實分享', message: '💬 真實客戶回饋\n\n「用了補充站的洗衣精之後，衣服真的變得很柔軟，而且味道好香！最重要的是，我每個月省了好多塑膠瓶！」\n\n—— 來自台中的小美媽媽 ❤️\n\n#客戶回饋 #真實分享', mediaType: '照片', reach: 4300, reactions: 210, comments: 67, shares: 28, totalEngagement: 305, engagementRate: 305/4300, createdTime: '2026-03-12T11:00:00+08:00', permalink: 'https://facebook.com/post/4', picture: '' },
    { id: '5', title: '新品上市！薰衣草柔軟精', message: '🆕 新品上市！\n\n等待已久的薰衣草柔軟精終於來了！天然薰衣草精油，讓你的衣物散發淡淡花香。\n\n即日起可到店補充，首週享 9 折優惠！', mediaType: '相簿', reach: 6800, reactions: 280, comments: 95, shares: 48, totalEngagement: 423, engagementRate: 423/6800, createdTime: '2026-03-15T16:30:00+08:00', permalink: 'https://facebook.com/post/5', picture: '' },
    { id: '6', title: '#地球日 #環保行動', message: '🌍 一起響應地球日！\n\n3/22 世界水資源日，我們的洗衣精使用可生物分解配方，對水源零負擔。\n\n帶著你的環保容器來補充，讓乾淨從洗衣開始！\n\n#地球日 #環保行動', mediaType: '影片', reach: 15200, reactions: 520, comments: 145, shares: 312, totalEngagement: 977, engagementRate: 977/15200, createdTime: '2026-03-22T09:00:00+08:00', permalink: 'https://facebook.com/post/6', picture: '' },
    { id: '7', title: '門市活動花絮', message: '🎉 上週末門市活動花絮！\n\n感謝所有來參加「環保洗衣工作坊」的朋友們！大家一起學習如何正確洗衣，還有 DIY 天然香氛球活動。\n\n下次活動預告：4/5 親子環保日', mediaType: '相簿', reach: 3200, reactions: 150, comments: 38, shares: 15, totalEngagement: 203, engagementRate: 203/3200, createdTime: '2026-03-25T12:00:00+08:00', permalink: 'https://facebook.com/post/7', picture: '' },
    { id: '8', title: '#月底特惠 #買多省多', message: '💰 月底加碼！\n\n3/28-3/31 補充滿 500 送環保購物袋乙個！\n數量有限，送完為止～\n\n#月底特惠 #買多省多', mediaType: '照片', reach: 7500, reactions: 290, comments: 72, shares: 85, totalEngagement: 447, engagementRate: 447/7500, createdTime: '2026-03-28T15:00:00+08:00', permalink: 'https://facebook.com/post/8', picture: '' },
  ],
  year: 2026,
  month: 3,
};

console.log('🧪 開始測試報告生成...\n');

// Step 1: 數據分析
const analyzer = new DataAnalyzer(mockData);
const result = analyzer.analyze();

console.log('📊 KPI 分析結果：');
console.log(`  貼文篇數：${result.kpi.totalPosts}`);
console.log(`  追蹤人數：${result.kpi.followersCount}`);
console.log(`  總觸及：${result.kpi.totalReach.toLocaleString()}`);
console.log(`  平均互動：${result.kpi.avgEngagement}`);
console.log(`  整體互動率：${(result.kpi.overallEngagementRate * 100).toFixed(2)}%`);
console.log(`  最高互動貼文：${result.topPost.title}`);
console.log('');

// Step 2: 生成 HTML 報告
const generator = new ReportGenerator(result);
const html = generator.generate();

const outputPath = path.join(__dirname, 'output', '測試報告_2026-03.html');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf-8');

console.log(`✅ 測試報告已生成：${outputPath}`);
console.log(`   檔案大小：${(Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1)} KB`);
console.log('\n🎉 測試完成！請用瀏覽器開啟報告確認效果。');
