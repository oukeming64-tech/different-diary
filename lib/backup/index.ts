import Dexie from "dexie";
import { getStage1Database, type Stage1Database } from "../stage1/db";
import { ensureLocalIdentity } from "../stage1/identity";
import { ACTIVITY_CATEGORIES, CHECK_IN_STATES, CURRENT_LOCAL_SCHEMA_VERSION, LOCAL_EXPORT_PRODUCT,
  LOCAL_IMAGE_MIME_TYPES, type CheckInV1, type ActivityRecordV1, type LocalImageAttachmentV1 } from "../stage1/types";

export const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
type PackedImage = Omit<LocalImageAttachmentV1, "blob" | "thumbnailBlob"> & { imageBase64: string; thumbnailBase64: string };
type Backup = { product: string; exportVersion: 4; schemaVersion: 3; exportedAt: string;
  localUser: { id: string; createdAt: string }; checkIns: CheckInV1[]; attachments: PackedImage[]; activities: ActivityRecordV1[] };
export type RestoreResult = { added: number; duplicates: number; conflicts: number };

async function base64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(chunks.join(""));
}
async function packImage(image: LocalImageAttachmentV1): Promise<PackedImage> {
  const { blob, thumbnailBlob, ...metadata } = image;
  return { ...metadata, imageBase64: await base64(blob), thumbnailBase64: await base64(thumbnailBlob) };
}

export async function createFullBackupJson(database: Stage1Database = getStage1Database()): Promise<string> {
  const user = await ensureLocalIdentity(database);
  const snapshot = await database.transaction("r", database.checkIns, database.attachments, database.activities, async () => ({
    checkIns: await database.checkIns.where("localUserId").equals(user.id).toArray(),
    attachments: await database.attachments.where("localUserId").equals(user.id).toArray(),
    activities: await database.activities.where("localUserId").equals(user.id).toArray(),
  }));
  if (snapshot.attachments.reduce((n, a) => n + a.blob.size + a.thumbnailBlob.size, 0) * 4 / 3 > MAX_BACKUP_BYTES) throw new Error("照片较多，备份超过本版 128 MB 的单文件上限。原记录仍在本机。");
  const json = JSON.stringify({ product: LOCAL_EXPORT_PRODUCT, exportVersion: 4, schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(), localUser: { id: user.id, createdAt: user.createdAt },
    ...snapshot, attachments: await Promise.all(snapshot.attachments.map(packImage)) } satisfies Backup);
  if (new Blob([json]).size > MAX_BACKUP_BYTES) throw new Error("照片较多，备份超过本版 128 MB 的单文件上限。原记录仍在本机。");
  return json;
}

function invalid(): never { throw new Error("这份文件不是完整有效的日记备份。请使用“完整备份”生成的文件；旧版照片索引不含照片本体。"); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function str(v: unknown): string { if (typeof v !== "string") return invalid(); return v; }
function id(v: unknown): string { const s = str(v); if (!s || s.length > 200) return invalid(); return s; }
function date(v: unknown): string { const s = str(v); if (!Number.isFinite(Date.parse(s))) return invalid(); return s; }
function nullable(v: unknown): string | null { return v === null ? null : str(v); }
function positive(v: unknown): number { if (typeof v !== "number" || !Number.isSafeInteger(v) || v <= 0) return invalid(); return v; }
function metric(v: unknown): number | null { if (v === null) return null; if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return invalid(); return v; }
function oneOf<T extends string>(v: unknown, values: readonly T[]): T { if (typeof v !== "string" || !values.includes(v as T)) return invalid(); return v as T; }
function rows(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return invalid();
  const result = v.map(object), ids = result.map((r) => id(r.id));
  if (new Set(ids).size !== ids.length) return invalid();
  return result;
}
function unpack(data: unknown, mime: string, size: number): Blob {
  const s = str(data);
  if (s.length % 4 || /[^A-Za-z0-9+/=]/.test(s)) return invalid();
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  if (bytes.length !== size) return invalid();
  return new Blob([bytes], { type: mime });
}
function parseBackup(text: string) {
  let data: Record<string, unknown>;
  try { data = object(JSON.parse(text)); } catch { return invalid(); }
  if (data.product !== LOCAL_EXPORT_PRODUCT || data.exportVersion !== 4 || data.schemaVersion !== 3) return invalid();
  const owner = id(object(data.localUser).id);
  const checkIns: CheckInV1[] = rows(data.checkIns).map((r) => {
    if (r.localUserId !== owner || (r.helpful !== null && typeof r.helpful !== "boolean")) return invalid();
    return { id: id(r.id), localUserId: owner, occurredAt: date(r.occurredAt), state: oneOf(r.state, CHECK_IN_STATES),
      intentId: str(r.intentId), userText: nullable(r.userText), responseKey: str(r.responseKey), responseText: str(r.responseText), helpful: r.helpful as boolean | null };
  });
  const checkIds = new Set(checkIns.map((r) => r.id));
  function child(r: Record<string, unknown>) {
    if (r.localUserId !== owner || !checkIds.has(id(r.checkInId))) return invalid();
    return { id: id(r.id), localUserId: owner, checkInId: id(r.checkInId), createdAt: date(r.createdAt) };
  }
  const attachments: LocalImageAttachmentV1[] = rows(data.attachments).map((r) => {
    const mimeType = oneOf(r.mimeType, LOCAL_IMAGE_MIME_TYPES), thumbnailMimeType = oneOf(r.thumbnailMimeType, LOCAL_IMAGE_MIME_TYPES);
    if (r.mediaType !== "image" || r.processingVersion !== 1) return invalid();
    const byteSize = positive(r.byteSize), thumbnailByteSize = positive(r.thumbnailByteSize);
    return { ...child(r), mediaType: "image", mimeType, thumbnailMimeType, byteSize, thumbnailByteSize, processingVersion: 1,
      width: positive(r.width), height: positive(r.height), thumbnailWidth: positive(r.thumbnailWidth), thumbnailHeight: positive(r.thumbnailHeight),
      blob: unpack(r.imageBase64, mimeType, byteSize), thumbnailBlob: unpack(r.thumbnailBase64, thumbnailMimeType, thumbnailByteSize) };
  });
  const activities: ActivityRecordV1[] = rows(data.activities).map((r) => ({ ...child(r), category: oneOf(r.category, ACTIVITY_CATEGORIES),
    customLabel: nullable(r.customLabel), note: nullable(r.note), durationMinutes: metric(r.durationMinutes), steps: metric(r.steps), distanceKm: metric(r.distanceKm) }));
  for (const collection of [attachments, activities]) {
    if (new Set(collection.map((r) => r.checkInId)).size !== collection.length) return invalid();
  }
  return { checkIns, attachments, activities };
}

// Key ordering and the device-local owner do not change record identity.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([k]) => k !== "localUserId").sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export async function restoreFullBackup(text: string, database: Stage1Database = getStage1Database()): Promise<RestoreResult> {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error("备份文件超过 128 MB，未导入。");
  const incoming = parseBackup(text); // Validate all rows and binaries before any write.
  const photoByCheck = new Map(incoming.attachments.map((a) => [a.checkInId, a]));
  const activityByCheck = new Map(incoming.activities.map((a) => [a.checkInId, a]));
  const user = await ensureLocalIdentity(database);
  return database.transaction("rw", database.checkIns, database.attachments, database.activities, async () => {
    const counts: RestoreResult = { added: 0, duplicates: 0, conflicts: 0 };
    for (const record of incoming.checkIns) {
      const photo = photoByCheck.get(record.id), activity = activityByCheck.get(record.id);
      const photos = photo ? [photo] : [], activities = activity ? [activity] : [];
      const existing = await database.checkIns.get(record.id);
      if (existing) {
        const existingPhotos = await database.attachments.where("checkInId").equals(record.id).toArray();
        const existingActivities = await database.activities.where("checkInId").equals(record.id).toArray();
        const [packedExisting, packedIncoming] = await Dexie.waitFor(Promise.all([
          Promise.all(existingPhotos.map(packImage)), Promise.all(photos.map(packImage)),
        ]));
        const same = existing.localUserId === user.id && canonical(existing) === canonical(record)
          && canonical(packedExisting) === canonical(packedIncoming) && canonical(existingActivities) === canonical(activities);
        counts[same ? "duplicates" : "conflicts"]++;
        continue;
      }
      const collision = (await database.attachments.bulkGet(photos.map((a) => a.id))).some(Boolean)
        || (await database.activities.bulkGet(activities.map((a) => a.id))).some(Boolean)
        || await database.attachments.where("checkInId").equals(record.id).count()
        || await database.activities.where("checkInId").equals(record.id).count();
      if (collision) { counts.conflicts++; continue; }
      await database.checkIns.add({ ...record, localUserId: user.id });
      await database.attachments.bulkAdd(photos.map((a) => ({ ...a, localUserId: user.id })));
      await database.activities.bulkAdd(activities.map((a) => ({ ...a, localUserId: user.id })));
      counts.added++;
    }
    return counts;
  });
}
