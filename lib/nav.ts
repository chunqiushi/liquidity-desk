// 将 Next 干净路由路径转换为 CloudStudio 静态托管可正确返回的显式 index.html 文件路径。
// CloudStudio 对"目录形式"URL 会兜底返回根 index.html（SPA 改写），只有显式带 .html 的文件路径才返回真实页面。
export function toStaticHref(path: string): string {
  if (!path) return "/index.html";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("#") ||
    path.startsWith("mailto:") ||
    path.startsWith("/_next/")
  ) {
    return path;
  }
  const [p, q] = path.split("?");
  let base = p.replace(/\/+$/, "");
  if (base === "") base = ""; // 根
  const file = base === "" ? "/index.html" : `${base}/index.html`;
  return q ? `${file}?${q}` : file;
}
