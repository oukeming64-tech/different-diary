import { useEffect, useState } from "react";

import {
  PhotoProcessingError,
  processPhoto,
  type ProcessedPhoto,
} from "../../lib/stage2";

export function usePhotoDraft() {
  const [processedPhoto, setProcessedPhoto] = useState<ProcessedPhoto | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl],
  );

  function clearPhotoDraft() {
    setProcessedPhoto(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    setIsProcessingPhoto(false);
  }

  async function preparePhoto(file: File) {
    setIsProcessingPhoto(true);
    setPhotoError(null);
    try {
      const photo = await processPhoto(file);
      setProcessedPhoto(photo);
      setPhotoPreviewUrl(URL.createObjectURL(photo.blob));
    } catch (error) {
      setPhotoError(
        error instanceof PhotoProcessingError
          ? error.message
          : "这张图片暂时没能在本机整理好，因此没有保存，也没有发送。",
      );
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  return {
    processedPhoto,
    photoPreviewUrl,
    photoError,
    isProcessingPhoto,
    clearPhotoDraft,
    preparePhoto,
  };
}
