import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = path.join(projectRoot, "dist-pages");
const sourcePath = path.join(outputRoot, "index.html");
const targetDirectory = path.join(outputRoot, "downloads");
const targetPath = path.join(targetDirectory, "different-diary.html");
const basePath = "/different-diary/";

function outputAssetPath(assetUrl) {
  const pathname = new URL(assetUrl, "https://example.invalid").pathname;
  const relativePath = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname.replace(/^\/+/, "");
  return path.join(outputRoot, relativePath);
}

const sourceHtml = await readFile(sourcePath, "utf8");
const stylesheetTag = sourceHtml.match(
  /<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/,
);
const scriptTag = sourceHtml.match(
  /<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/,
);

if (!stylesheetTag || !scriptTag) {
  throw new Error("GitHub Pages build did not emit one stylesheet and one script");
}

const [css, javascript] = await Promise.all([
  readFile(outputAssetPath(stylesheetTag[1]), "utf8"),
  readFile(outputAssetPath(scriptTag[1]), "utf8"),
]);

const standaloneHtml = sourceHtml
  .replace(
    '<html lang="zh-CN">',
    '<html lang="zh-CN" data-standalone-download="true">',
  )
  .replace(/<meta\s+property="og:[^"]+"[^>]*>\s*/g, "")
  .replace(
    /<link\s+rel="icon"[^>]*>/,
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2216%22 fill=%22%23e9e6e4%22/%3E%3Ctext x=%2232%22 y=%2243%22 text-anchor=%22middle%22 font-size=%2236%22%3E%E8%AE%B0%3C/text%3E%3C/svg%3E">',
  )
  .replace(/<link\s+rel="(?:apple-touch-icon|manifest)"[^>]*>\s*/g, "")
  .replace(
    "<title>不一样的日记｜先接住你，再说别的</title>",
    "<title>不一样的日记（下载版）</title>",
  )
  .replace(stylesheetTag[0], () => `<style>${css}</style>`)
  .replace(
    scriptTag[0],
    () =>
      `<script type="module">${javascript.replaceAll("</script", "<\\/script")}</script>`,
  );

await mkdir(targetDirectory, { recursive: true });
await writeFile(targetPath, standaloneHtml, "utf8");

const sizeInKiB = Math.ceil(Buffer.byteLength(standaloneHtml) / 1024);
console.log(`Created downloads/different-diary.html (${sizeInKiB} KiB)`);
