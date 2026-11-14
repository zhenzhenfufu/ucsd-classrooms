/**
 * Imgur serves resized copies of a photo when a size letter follows its ID:
 * `m` is 320px wide, `l` 640px and `h` 1024px. Building photos are 4032px
 * originals of about 3 MB, while `l` is about 65 KB.
 */
export type ImgurSize = "m" | "l" | "h";

const WIDTHS: Record<ImgurSize, number> = { m: 320, l: 640, h: 1024 };
const IMGUR_URL = /^(https:\/\/i\.imgur\.com\/)([A-Za-z0-9]{7})(\.[a-z]+)$/;

/** The resized copy of an Imgur photo, or the URL unchanged for other hosts. */
export function resizedImage(url: string, size: ImgurSize): string {
  const match = url.match(IMGUR_URL);
  return match ? `${match[1]}${match[2]}${size}${match[3]}` : url;
}

/** A `srcset` offering the given sizes, or undefined for non-Imgur photos. */
export function imageSrcSet(url: string, sizes: ImgurSize[]): string | undefined {
  if (!IMGUR_URL.test(url)) {
    return undefined;
  }
  return sizes
    .map((size) => `${resizedImage(url, size)} ${WIDTHS[size]}w`)
    .join(", ");
}
