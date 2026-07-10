import {
  savePhotoCheckIn,
  type CheckInState,
  type SavedPhotoCheckIn,
} from "../stage1";
import type { ProcessedPhoto } from "./image-processor";

export type RecordPhotoOnlyInput = {
  image: ProcessedPhoto;
  intentId: string;
  localUserId: string;
  occurredAt?: string;
  responseKey: string;
  responseText: string;
  state: CheckInState;
  userText?: string | null;
};

/**
 * The record-only path is deliberately isolated from every remote capability.
 * Keeping this adapter small makes the zero-network promise easy to audit.
 */
export async function recordPhotoOnly(
  input: RecordPhotoOnlyInput,
): Promise<SavedPhotoCheckIn> {
  return savePhotoCheckIn({
    localUserId: input.localUserId,
    state: input.state,
    intentId: input.intentId,
    userText: input.userText,
    responseKey: input.responseKey,
    responseText: input.responseText,
    occurredAt: input.occurredAt,
    image: {
      blob: input.image.blob,
      height: input.image.height,
      mimeType: input.image.mimeType,
      thumbnailBlob: input.image.thumbnailBlob,
      thumbnailHeight: input.image.thumbnailHeight,
      thumbnailMimeType: input.image.thumbnailMimeType,
      thumbnailWidth: input.image.thumbnailWidth,
      width: input.image.width,
    },
  });
}

