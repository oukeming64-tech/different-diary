"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";

export function CalmBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <header className="calm-backbar">
      <button className="back-button" onClick={onClick} type="button">
        <ArrowLeft size={18} aria-hidden="true" />
        {label}
      </button>
      <span className="no-task-pill">不用完成任务</span>
    </header>
  );
}

export function LocalBlobImage({
  alt,
  blob,
  className,
  height,
  width,
}: {
  alt: string;
  blob: Blob;
  className: string;
  height: number;
  width: number;
}) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    const image = imageRef.current;
    if (image) image.src = objectUrl;
    return () => {
      if (image?.src === objectUrl) image.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return (
    // The source is a short-lived local Blob URL; image optimization would
    // add work without creating a network-safe asset.
    <img
      alt={alt}
      className={className}
      height={height}
      ref={imageRef}
      width={width}
    />
  );
}
