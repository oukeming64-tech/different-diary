import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const appFiles = [
  "app/page.tsx",
  "app/diary/diary-app.tsx",
  "app/diary/model.ts",
  "app/diary/home-screen.tsx",
  "app/diary/conversation-screens.tsx",
  "app/diary/memory-screens.tsx",
  "app/diary/use-diary-controller.ts",
  "app/diary/use-local-diary-library.ts",
  "app/diary/use-photo-draft.ts",
  "app/diary/shared.tsx",
];

export async function readAppSource() {
  const sources = await Promise.all(
    appFiles.map((file) => readFile(new URL(file, root), "utf8")),
  );
  return sources.join("\n");
}
