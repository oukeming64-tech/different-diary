import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

function tokenDeclarations(source, namePattern) {
  return [...source.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)]
    .map((match) => ({ name: match[1], value: match[2].trim() }))
    .filter(({ name }) => namePattern.test(name));
}

function parseColor(value) {
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3
      ? [...hex].map((digit) => `${digit}${digit}`).join("")
      : hex;
    return {
      red: Number.parseInt(expanded.slice(0, 2), 16),
      green: Number.parseInt(expanded.slice(2, 4), 16),
      blue: Number.parseInt(expanded.slice(4, 6), 16),
      alpha:
        expanded.length === 8
          ? Number.parseInt(expanded.slice(6, 8), 16) / 255
          : 1,
    };
  }

  const rgb = value.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/i,
  );
  if (!rgb) return null;
  return {
    red: Number(rgb[1]),
    green: Number(rgb[2]),
    blue: Number(rgb[3]),
    alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
  };
}

function isWarmNeutral(color, minimumBrightness, maximumBrightness) {
  if (!color) return false;
  const brightness = (color.red + color.green + color.blue) / 3;
  return (
    color.red >= color.green &&
    color.green >= color.blue &&
    brightness >= minimumBrightness &&
    brightness <= maximumBrightness
  );
}

function classDeclarations(source, className) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) =>
      match[1]
        .split(",")
        .some((selector) =>
          new RegExp(`(?:^|\\s)\\.${className}$`).test(selector.trim()),
        ),
    )
    .map((match) => match[2])
    .join("\n");
}

function cssLengthToPixels(value) {
  const normalized = value.trim().replace(/!important/g, "").trim();
  if (/^0(?:\.0+)?$/.test(normalized)) return 0;
  const match = normalized.match(/^(\d+(?:\.\d+)?)(px|rem)$/);
  if (!match) return Number.NaN;
  return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
}

test("uses warm editorial tokens for both paper and readable text", async () => {
  const editorial = await read("app/editorial.css");
  const surfaceTokens = tokenDeclarations(
    editorial,
    /(?:surface|paper|canvas)/i,
  );
  const textTokens = tokenDeclarations(editorial, /(?:text|ink)/i);
  const warmSurface = surfaceTokens.find(({ value }) =>
    isWarmNeutral(parseColor(value), 205, 255),
  );
  const warmText = textTokens.find(({ value }) =>
    isWarmNeutral(parseColor(value), 20, 145),
  );

  assert.ok(
    warmSurface,
    "editorial.css needs an explicitly warm light surface/paper token",
  );
  assert.ok(
    warmText,
    "editorial.css needs an explicitly warm dark text/ink token",
  );
  for (const token of [warmSurface, warmText]) {
    const uses = editorial.match(new RegExp(`var\\(${token.name}\\)`, "g")) ?? [];
    assert.ok(uses.length > 0, `${token.name} must be used by the editorial layer`);
  }
});

test("uses a local humanist sans or mixed display-font strategy", async () => {
  const editorial = await read("app/editorial.css");
  const displayFont = tokenDeclarations(editorial, /font-display/i).at(-1)?.value;

  assert.ok(displayFont, "editorial.css must define --font-display");
  assert.match(
    displayFont,
    /(?:-apple-system|BlinkMacSystemFont|system-ui|PingFang SC|Hiragino Sans|Microsoft YaHei|Noto Sans|sans-serif|var\(--font-sans\))/i,
    "display type must not rely only on Songti or a pure serif stack",
  );
});

test("keeps the two primary choice surfaces square and shadow-free", async () => {
  const editorial = await read("app/editorial.css");

  for (const className of ["state-entry", "choice-row"]) {
    const declarations = classDeclarations(editorial, className);
    assert.match(
      declarations,
      /(?:^|;)\s*border-radius\s*:\s*0(?:\.0+)?\s*(?:;|$)/,
      `.${className} must remain square`,
    );
    assert.match(
      declarations,
      /(?:^|;)\s*box-shadow\s*:\s*none(?:\s*!important)?\s*(?:;|$)/,
      `.${className} must remain shadow-free`,
    );
  }
});

test("softens separators with low contrast or a fading gradient", async () => {
  const editorial = await read("app/editorial.css");
  const hasFadingDivider =
    /\.(?:hairline[\w-]*|state-index-item)[^{]*\{[^}]*background(?:-image)?\s*:\s*(?:linear|radial)-gradient\(/s.test(
      editorial,
    );
  const lineTokens = tokenDeclarations(editorial, /editorial-line/i);
  const allLinesAreLowContrast =
    lineTokens.length > 0 &&
    lineTokens.every(({ value }) => {
      const color = parseColor(value);
      return color !== null && color.alpha <= 0.12;
    });

  assert.ok(
    hasFadingDivider || allLinesAreLowContrast,
    "hairlines must fade with a gradient or keep every line token at <=12% opacity",
  );
});

test("preserves touch, focus, reduced motion and the ambient scene", async () => {
  const [layout, page, globals, motion, editorial] = await Promise.all([
    read("app/layout.tsx"),
    read("app/page.tsx"),
    read("app/globals.css"),
    read("app/motion.css"),
    read("app/editorial.css"),
  ]);
  const combinedStyles = `${globals}\n${motion}\n${editorial}`;
  const button = editorial.match(/(?:^|})\s*button\s*\{([^}]*)\}/)?.[1] ?? "";
  const touchSize = button.match(
    /min-(?:block-size|height)\s*:\s*([^;]+)/,
  )?.[1];

  assert.ok(touchSize, "the editorial layer must keep an explicit button touch size");
  assert.ok(
    cssLengthToPixels(touchSize) >= 44,
    "button touch targets must remain at least 44px",
  );
  assert.match(combinedStyles, /:focus-visible\b[^{}]*\{[^}]*outline\s*:/s);
  assert.match(combinedStyles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(layout, /import ["']\.\/motion\.css["']/);
  assert.match(page, /<AmbientScene\b/);
  assert.match(page, /\bmotion-stage\b/);
});

test("does not introduce remote fonts or imagery", async () => {
  const sources = await Promise.all(
    [
      "app/page.tsx",
      "app/ambient-scene.tsx",
      "app/globals.css",
      "app/motion.css",
      "app/editorial.css",
    ].map((file) => read(file)),
  );
  const productVisualSource = sources.join("\n");

  assert.doesNotMatch(
    productVisualSource,
    /(?:@import\s+(?:url\()?\s*["']?https?:|url\(\s*["']?(?:https?:)?\/\/)/i,
    "warmth must come from local CSS and system fonts, not remote assets",
  );
});
