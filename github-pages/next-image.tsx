import type { ImgHTMLAttributes } from "react";

type StaticImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "src"
> & {
  alt: string;
  src: string;
  unoptimized?: boolean;
};

export default function StaticImage({
  alt,
  unoptimized,
  ...imageProps
}: StaticImageProps) {
  return (
    // The GitHub Pages build has no image optimization server.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...imageProps}
      alt={alt}
      data-unoptimized={unoptimized ? "true" : undefined}
    />
  );
}
