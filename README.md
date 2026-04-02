# 📊 FB 社群成果分析報告生成工具

自動串接 Facebook 粉專，抓取指定月份貼文數據並生成精美的社群成果分析 HTML 報告。

---

## 📋 功能特色

- ✅ **自動抓取** — 透過 Meta Graph API 串接粉專，自動取得貼文數據
- ✅ **追蹤數抓取** — 自動取得粉專追蹤人數
- ✅ **指定月份** — 支援抓取任意月份的數據
- ✅ **數據分析** — 自動計算 KPI、互動率、主題分析、素材型式分析
- ✅ **HTML 報告** — 生成符合品牌規範的精美互動式報告
- ✅ **Excel 匯出** — 同步匯出 Excel 檔案供備份或其他用途
- ✅ **自動洞察** — 基於數據生成受歡迎內容特徵、優化建議、活動策略

---

## 🚀 快速開始

### 1. 安裝依賴

```bash
cd social
npm install
```

### 2. 設定環境變數

複製範例檔案並填入你的 API 憑證：

```bash
copy .env.example .env
```

編輯 `.env` 填入以下資訊：

```env
FB_PAGE_ID=你的粉專ID
FB_PAGE_ACCESS_TOKEN=你的長期權杖
FB_API_VERSION=v21.0
BRAND_NAME=洗衣精補充站
OUTPUT_DIR=./output
EXPORT_EXCEL=true
```

### 3. 執行工具

```bash
# 互動模式（會詢問月份）
npm start

# 指定月份
node index.js --month 2026-03

# 只抓取數據（匯出 Excel，不生成報告）
node index.js --month 2026-03 --fetch-only

# 完整流程
node index.js --month 2026-03
```

---

## 📁 輸出檔案

執行完成後，會在 `output/` 資料夾產生：

| 檔案 | 說明 |
|------|------|
| `{品牌名}_YYYY-MM_社群成果分析報告.html` | 完整 HTML 分析報告 |
| `{品牌名}_YYYY-MM_貼文數據.xlsx` | Excel 原始數據（可選） |

---

## 📊 報告內容

報告包含以下區塊（依序）：

1. **頁首** — 品牌漸層標頭
2. **KPI 概覽** — 貼文篇數、追蹤人數、觸及人數、平均互動
3. **最高互動率貼文** — Highlight 區塊
4. **內容表現分析** — 主題排名 + 素材型式分析（雙欄）
5. **全貼文明細表** — 完整數據表格
6. **受歡迎內容特徵** — 4 張洞察卡片
7. **優化方向建議** — 3 張策略卡片
8. **未來活動策略** — 規劃表格
9. **頁尾** — 品牌資訊

---

## 🔑 FB API 權限需求

你的 Facebook App 需要以下權限：

| 權限 | 用途 |
|------|------|
| `pages_show_list` | 列出管理的粉專 |
| `pages_read_engagement` | 讀取貼文互動數據 |
| `read_insights` | 讀取貼文觸及等洞察數據 |

### 如何取得 Page Access Token

1. 前往 [Meta for Developers](https://developers.facebook.com/)
2. 進入你的 App → 工具 → [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
3. 選擇你的 App
4. 勾選 `pages_show_list`、`pages_read_engagement`、`read_insights`
5. 點擊「產生存取權杖」
6. 選擇你的粉專
7. 複製產生的 Token

> ⚠️ **注意**：短期 Token 有效期約 1 小時。建議透過 [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) 延展為長期 Token（60 天）。

### 延展為長期 Token

```
GET /oauth/access_token?
  grant_type=fb_exchange_token&
  client_id={app-id}&
  client_secret={app-secret}&
  fb_exchange_token={short-lived-token}
```

---

## 📂 專案結構

```
social/
├── index.js                  # CLI 主入口
├── package.json              # 專案設定
├── .env                      # 環境變數（需自行建立）
├── .env.example              # 環境變數範例
├── src/
│   ├── fb-api.js             # Facebook Graph API 串接
│   ├── data-analyzer.js      # 數據分析引擎
│   ├── report-generator.js   # HTML 報告生成器
│   └── excel-export.js       # Excel 匯出模組
├── output/                   # 報告輸出目錄
└── README.md                 # 本文件
```

---

## 🔧 自訂設定

### 品牌配色

在 `src/report-generator.js` 中可自訂品牌色彩：

```javascript
// 主色系
主色: #0057B7
CTA色: #FFA000, #00A0BB, #5CBEB2
輔助色: #D4EAED, #EFEFED, #FFFFFF
```

### API 版本

在 `.env` 中可設定 Graph API 版本：

```env
FB_API_VERSION=v21.0
```

---

## ❓ 常見問題

### Token 過期怎麼辦？
重新至 Graph API Explorer 產生新 Token，並更新 `.env` 檔案。

### 抓不到觸及數據？
確認 App 已申請且獲得 `read_insights` 權限。部分分享貼文可能無法取得 insights。

### 可以分析多個月份嗎？
目前一次執行分析一個月份。可透過批次腳本多次執行不同月份。
