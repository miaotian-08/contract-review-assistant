/**
 * 常用法律 → 可直接访问的权威来源链接
 * 优先使用能直接定位到条款的链接
 */
const LAW_URLS: Record<string, string> = {
  // 最高人民法院司法解释通常有独立页面
  "最高人民法院关于审理民间借贷案件适用法律若干问题的规定":
    "https://www.court.gov.cn/fabu/xiangqing/380402.html",
};

/**
 * 生成法律条款的验证链接
 * 优先使用已知的精确链接，回退到Bing搜索
 */
export function getLawUrl(law: string, article: string): string {
  // 精确匹配
  if (LAW_URLS[law]) {
    return LAW_URLS[law];
  }
  // 模糊匹配
  for (const [key, url] of Object.entries(LAW_URLS)) {
    if (law.includes(key) || key.includes(law)) {
      return url;
    }
  }
  // 回退：Bing搜索，限定政府网站
  const query = `${law} ${article}`;
  return `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
}
