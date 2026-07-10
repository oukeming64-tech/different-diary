export const PHOTO_PROCESSING_VERSION = 1 as const;
export const MAX_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024;
export const PHOTO_MAX_INPUT_PIXELS = 40_000_000;
export const MAX_IMAGE_LONG_EDGE_PX = 1600;
export const MAX_IMAGE_FILE_BYTES = 1.5 * 1024 * 1024;
export const PHOTO_THUMBNAIL_EDGE = 360;

export const PHOTO_ACCEPTED_INPUT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProcessedPhoto = {
  blob: Blob;
  byteSize: number;
  width: number;
  height: number;
  mimeType: "image/jpeg";
  processingVersion: typeof PHOTO_PROCESSING_VERSION;
  thumbnailBlob: Blob;
  thumbnailByteSize: number;
  thumbnailHeight: number;
  thumbnailMimeType: "image/jpeg";
  thumbnailWidth: number;
};

export type PhotoProcessingErrorCode =
  | "UNSUPPORTED_IMAGE"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_DECODE_FAILED"
  | "IMAGE_ENCODE_FAILED";

export class PhotoProcessingError extends Error {
  readonly code: PhotoProcessingErrorCode;

  constructor(code: PhotoProcessingErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "PhotoProcessingError";
    this.code = code;
  }
}

type DecodedImage = {
  height: number;
  source: CanvasImageSource;
  width: number;
  release(): void;
};

function scaledDimensions(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

async function decodePhoto(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        height: bitmap.height,
        source: bitmap,
        width: bitmap.width,
        release: () => bitmap.close(),
      };
    } catch {
      // Some mobile browsers expose createImageBitmap but reject its orientation
      // option. The HTMLImageElement path below remains entirely on-device and
      // applies the browser's normal EXIF orientation handling.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return {
      height: image.naturalHeight,
      source: image,
      width: image.naturalWidth,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new PhotoProcessingError(
      "IMAGE_DECODE_FAILED",
      "这张图片暂时没能在本机打开。",
      error,
    );
  }
}

function createPhotoCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new PhotoProcessingError(
      "IMAGE_ENCODE_FAILED",
      "这张图片暂时没能在本机整理好。",
    );
  }
  context.fillStyle = "#f7f1e9";
  context.fillRect(0, 0, width, height);
  return { canvas, context };
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else {
          reject(
            new PhotoProcessingError(
              "IMAGE_ENCODE_FAILED",
              "这张图片暂时没能在本机整理好。",
            ),
          );
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

async function renderJpeg(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  quality: number,
) {
  const dimensions = scaledDimensions(sourceWidth, sourceHeight, maxEdge);
  const { canvas, context } = createPhotoCanvas(
    dimensions.width,
    dimensions.height,
  );
  context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
  return {
    blob: await canvasToJpeg(canvas, quality),
    ...dimensions,
  };
}

async function renderMainPhoto(decoded: DecodedImage) {
  let edge = MAX_IMAGE_LONG_EDGE_PX;
  let rendered = await renderJpeg(
    decoded.source,
    decoded.width,
    decoded.height,
    edge,
    0.84,
  );

  for (const quality of [0.76, 0.68, 0.6]) {
    if (rendered.blob.size <= MAX_IMAGE_FILE_BYTES) break;
    rendered = await renderJpeg(
      decoded.source,
      decoded.width,
      decoded.height,
      edge,
      quality,
    );
  }

  while (rendered.blob.size > MAX_IMAGE_FILE_BYTES && edge > 900) {
    edge = Math.max(900, Math.round(edge * 0.82));
    rendered = await renderJpeg(
      decoded.source,
      decoded.width,
      decoded.height,
      edge,
      0.68,
    );
  }

  if (rendered.blob.size > MAX_IMAGE_FILE_BYTES) {
    throw new PhotoProcessingError(
      "IMAGE_TOO_LARGE",
      "这张图片整理后仍然有点大，暂时没有保存。",
    );
  }

  return rendered;
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (
    !PHOTO_ACCEPTED_INPUT_TYPES.includes(
      file.type as (typeof PHOTO_ACCEPTED_INPUT_TYPES)[number],
    )
  ) {
    throw new PhotoProcessingError(
      "UNSUPPORTED_IMAGE",
      "暂时支持 JPEG、PNG 和 WebP 图片。",
    );
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SOURCE_BYTES) {
    throw new PhotoProcessingError(
      "IMAGE_TOO_LARGE",
      "这张图片有点大，请换一张再试。",
    );
  }

  const decoded = await decodePhoto(file);
  try {
    if (
      decoded.width <= 0 ||
      decoded.height <= 0 ||
      decoded.width * decoded.height > PHOTO_MAX_INPUT_PIXELS
    ) {
      throw new PhotoProcessingError(
        "IMAGE_TOO_LARGE",
        "这张图片的尺寸太大，暂时没有保存。",
      );
    }

    const [main, thumbnail] = await Promise.all([
      renderMainPhoto(decoded),
      renderJpeg(
        decoded.source,
        decoded.width,
        decoded.height,
        PHOTO_THUMBNAIL_EDGE,
        0.72,
      ),
    ]);

    return {
      blob: main.blob,
      byteSize: main.blob.size,
      width: main.width,
      height: main.height,
      mimeType: "image/jpeg",
      processingVersion: PHOTO_PROCESSING_VERSION,
      thumbnailBlob: thumbnail.blob,
      thumbnailByteSize: thumbnail.blob.size,
      thumbnailHeight: thumbnail.height,
      thumbnailMimeType: "image/jpeg",
      thumbnailWidth: thumbnail.width,
    };
  } finally {
    decoded.release();
  }
}
