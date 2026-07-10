import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

async function readOptional(relativePath) {
  try {
    return await read(relativePath);
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function cssRules(source) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: match[1]
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean),
    declarations: match[2],
  }));
}

function selectorIsBaseClass(selector, className) {
  return new RegExp(`(?:^|\\s)\\.${className}$`).test(selector);
}

function declarationsForClass(source, className) {
  return cssRules(source)
    .filter((rule) =>
      rule.selectors.some((selector) => selectorIsBaseClass(selector, className)),
    )
    .map((rule) => rule.declarations)
    .join("\n");
}

function cssVariables(source) {
  return new Map(
    [...source.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
}

function cssLengthToPixels(rawValue, variables) {
  const resolved = rawValue
    .replace(/var\((--[\w-]+)\)/g, (_, name) => variables.get(name) ?? "")
    .replace(/!important/g, "")
    .trim();
  const parts = resolved.split(/[\s/]+/).filter(Boolean);
  if (parts.length === 0) return Number.NaN;

  const pixelValues = parts.map((part) => {
    if (/^0(?:\.0+)?$/.test(part)) return 0;
    const match = part.match(/^(\d+(?:\.\d+)?)(px|rem)$/);
    if (!match) return Number.NaN;
    return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
  });
  return pixelValues.some(Number.isNaN)
    ? Number.NaN
    : Math.max(...pixelValues);
}

function propertyValue(declarations, property) {
  const matches = [
    ...declarations.matchAll(
      new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "g"),
    ),
  ];
  return matches.at(-1)?.[1].trim();
}

test("loads the editorial override after the base and motion layers", async () => {
  const layout = await read("app/layout.tsx");
  const importPosition = (path) =>
    layout.search(new RegExp(`import\\s+["']\\./${path}\\.css["']`));
  const editorialImport = importPosition("editorial");

  assert.notEqual(editorialImport, -1, "layout must import app/editorial.css");
  assert.ok(
    editorialImport > importPosition("globals") &&
      editorialImport > importPosition("motion"),
    "editorial.css must load after the base and motion layers",
  );
});

test("turns the four home choices into ordered editorial entries", async () => {
  const page = await read("app/page.tsx");

  assert.ok(
    /className=["'][^"']*\bstate-entry\b[^"']*["']/.test(page),
    "home choices must use the state-entry class",
  );
  assert.ok(
    /className=["'][^"']*\bstate-index\b[^"']*["']/.test(page),
    "home choices must render a state-index",
  );
  const hasLiteralNumbers = ["01", "02", "03", "04"].every((number) =>
    new RegExp(`["']${number}["']`).test(page),
  );
  const hasGeneratedNumbers =
    /String\(\s*index\s*\+\s*1\s*\)\.padStart\(\s*2\s*,\s*["']0["']\s*\)/.test(
      page,
    );
  const hasWarmOrdinals =
    /stateOrdinals\s*=\s*\[\s*["']一["']\s*,\s*["']二["']\s*,\s*["']三["']\s*,\s*["']四["']\s*\]/s.test(
      page,
    ) && /\{stateOrdinals\[index\]\}/.test(page);
  assert.ok(
    hasLiteralNumbers || hasGeneratedNumbers || hasWarmOrdinals,
    "the four entries must visibly resolve to an intentional ordered sequence",
  );
});

test("sets a restrained editorial radius scale", async () => {
  const editorial = await readOptional("app/editorial.css");
  const variables = cssVariables(editorial);
  const requirements = [
    ["--r-card", 8],
    ["--r-control", 8],
    ["--r-response", 2],
  ];

  for (const [name, maximumPixels] of requirements) {
    const value = variables.get(name);
    assert.ok(value, `editorial.css must override ${name}`);
    const pixels = cssLengthToPixels(value, variables);
    assert.ok(
      Number.isFinite(pixels) && pixels <= maximumPixels,
      `${name} must be at most ${maximumPixels}px; received ${value}`,
    );
  }
});

test("flattens the primary list surfaces instead of restyling them as cards", async () => {
  const editorial = await readOptional("app/editorial.css");
  const variables = cssVariables(editorial);
  const listSurfaces = [
    "state-entry",
    "choice-row",
    "recent-link",
    "memory-action-card",
    "memory-card",
    "data-card",
  ];

  for (const className of listSurfaces) {
    const declarations = declarationsForClass(editorial, className);
    assert.ok(
      declarations,
      `editorial.css must explicitly treat .${className}`,
    );
    const radius = propertyValue(declarations, "border-radius");
    assert.ok(radius, `.${className} must set border-radius explicitly`);
    const radiusPixels = cssLengthToPixels(radius, variables);
    assert.ok(
      Number.isFinite(radiusPixels) && radiusPixels <= 8,
      `.${className} must use square or <=8px corners; received ${radius}`,
    );
  }

  for (const className of ["state-entry", "choice-row"]) {
    const declarations = declarationsForClass(editorial, className);
    assert.equal(
      cssLengthToPixels(
        propertyValue(declarations, "border-radius") ?? "",
        variables,
      ),
      0,
      `.${className} must be explicitly square`,
    );
    assert.match(
      declarations,
      /(?:^|;)\s*box-shadow\s*:\s*none(?:\s*!important)?\s*(?:;|$)/,
      `.${className} must explicitly remove the card shadow`,
    );
  }
});

test("uses a wired hairline separator as the editorial rhythm", async () => {
  const [page, editorial] = await Promise.all([
    read("app/page.tsx"),
    readOptional("app/editorial.css"),
  ]);

  const wiredHairlineClasses = [
    ...page.matchAll(/\bhairline(?:-[a-z][\w-]*)?\b/gi),
  ].map((match) => match[0]);
  assert.ok(wiredHairlineClasses.length > 0, "the product page must wire a hairline separator");
  const hairlineDeclarations = [...new Set(wiredHairlineClasses)]
    .map((className) => declarationsForClass(editorial, className))
    .join("\n");
  assert.match(
    hairlineDeclarations,
    /(?:border-(?:block|bottom|top)|background)\s*:/,
    "a wired hairline class must render a real one-dimensional separator",
  );
  assert.match(
    hairlineDeclarations,
    /(?:1px|0\.0625rem)/,
    "the separator should remain a one-pixel hairline",
  );
});

test("preserves a minimum 44px touch target", async () => {
  const editorial = await readOptional("app/editorial.css");
  const buttonRules = cssRules(editorial).filter((rule) =>
    rule.selectors.some((selector) => /(?:^|\s)button$/.test(selector)),
  );
  const touchSizes = buttonRules
    .map((rule) =>
      propertyValue(rule.declarations, "min-block-size") ??
      propertyValue(rule.declarations, "min-height"),
    )
    .filter(Boolean)
    .map((value) => cssLengthToPixels(value, cssVariables(editorial)));

  assert.ok(
    touchSizes.some((pixels) => Number.isFinite(pixels) && pixels >= 44),
    "editorial.css must preserve a minimum 44px touch target for buttons",
  );
});

test("preserves keyboard focus and reduced-motion behavior", async () => {
  const [globals, motion, editorial] = await Promise.all([
    read("app/globals.css"),
    read("app/motion.css"),
    readOptional("app/editorial.css"),
  ]);
  const combined = `${globals}\n${motion}\n${editorial}`;

  assert.match(combined, /:focus-visible\b[^{}]*\{[^}]*\boutline\s*:/s);
  assert.doesNotMatch(
    editorial,
    /:focus-visible\b[^{}]*\{[^}]*\boutline\s*:\s*none/s,
    "the editorial layer must not erase keyboard focus",
  );

  const reducedMotionStart = combined.lastIndexOf(
    "@media (prefers-reduced-motion: reduce)",
  );
  assert.notEqual(reducedMotionStart, -1);
  const reducedMotionRules = combined.slice(reducedMotionStart);
  assert.match(
    reducedMotionRules,
    /(?:animation\s*:\s*none|animation-(?:duration|iteration-count)\s*:)/,
  );
  assert.match(reducedMotionRules, /transition-duration\s*:/);
});

test("keeps the ambient scene and semantic motion wiring intact", async () => {
  const [layout, page] = await Promise.all([
    read("app/layout.tsx"),
    read("app/page.tsx"),
  ]);

  assert.match(layout, /import ["']\.\/motion\.css["']/);
  assert.match(page, /<AmbientScene\b/);
  for (const className of [
    "motion-stage",
    "motion-branch",
    "motion-reply",
    "motion-saved",
    "motion-timeline",
  ]) {
    assert.match(page, new RegExp(`\\b${className}\\b`));
  }
});
