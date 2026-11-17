type Props = {
  mediaKey: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  width?: number;
  height?: number;
};

/** Responsive image served from /media with srcset (640 / 1280 / 2000 px WebP). */
export function Picture({ mediaKey, alt, className = "", sizes = "100vw", priority = false, width = 1600, height = 1067 }: Props) {
  if (!mediaKey) {
    return (
      <div className={`flex items-center justify-center bg-sand-200 text-sm text-ink-muted ${className}`} role="img" aria-label={alt || "No image yet"}>
        No image yet
      </div>
    );
  }
  const src = (s: string) => `/media/${mediaKey}/${s}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src("md")}
      srcSet={`${src("sm")} 640w, ${src("md")} 1280w, ${src("lg")} 2000w`}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}
