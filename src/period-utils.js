/**
 * 期間工具：以純字串/UTC 運算，避免 toISOString() 在 UTC+8 造成差一天
 */
const pad = (n) => String(n).padStart(2, '0');
const fmtYMD = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parseYMD = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/**
 * 取得「上一期」：
 * - 選取範圍剛好是單一整月 → 上個月整月（10月 → 9月）
 * - 其他任意區間 → 緊接在前、天數相同的區間
 */
function getPreviousPeriod(startStr, endStr) {
  const s = parseYMD(startStr);
  const e = parseYMD(endStr);
  const lastOfMonth = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0));
  const isFullMonth =
    s.getUTCDate() === 1 &&
    s.getUTCFullYear() === e.getUTCFullYear() &&
    s.getUTCMonth() === e.getUTCMonth() &&
    e.getTime() === lastOfMonth.getTime();

  if (isFullMonth) {
    const ps = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - 1, 1));
    const pe = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 0));
    return { type: 'month', startDate: fmtYMD(ps), endDate: fmtYMD(pe), label: `${ps.getUTCMonth() + 1}月` };
  }
  const days = Math.round((e - s) / 86400000) + 1;
  const pe = new Date(s.getTime() - 86400000);
  const ps = new Date(pe.getTime() - (days - 1) * 86400000);
  return { type: 'period', startDate: fmtYMD(ps), endDate: fmtYMD(pe), label: '前一期' };
}

module.exports = { getPreviousPeriod, fmtYMD, parseYMD };
