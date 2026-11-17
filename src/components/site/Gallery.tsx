"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

type Img = { media_key: string; alt: string };

function src(key: string, size: "sm" | "md" | "lg") {
  return `/media/${key}/${size}`;
}

export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const show = (i: number, el?: HTMLElement | null) => {
    opener.current = el ?? null;
    setOpen(i);
  };
  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus();
  }, []);
  const step = useCallback((d: number) => setOpen((i) => (i == null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open != null && !el.open) el.showModal();
    if (open == null && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (images.length === 0) {
    return <div className="flex aspect-[16/9] items-center justify-center rounded-3xl bg-sand-200 text-ink-muted">Photos coming soon</div>;
  }

  const [hero, ...rest] = images;
  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-3xl md:grid-cols-4 md:grid-rows-2 md:gap-3">
        <button
          type="button"
          onClick={(e) => show(0, e.currentTarget)}
          className="group relative aspect-[4/3] overflow-hidden md:col-span-2 md:row-span-2 md:aspect-auto md:h-full"
          aria-label={`Open photo 1 of ${images.length}: ${hero.alt}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src(hero.media_key, "md")}
            srcSet={`${src(hero.media_key, "sm")} 640w, ${src(hero.media_key, "md")} 1280w, ${src(hero.media_key, "lg")} 2000w`}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={hero.alt}
            fetchPriority="high"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        </button>
        {rest.slice(0, 4).map((img, i) => (
          <button
            key={img.media_key + i}
            type="button"
            onClick={(e) => show(i + 1, e.currentTarget)}
            className="group relative hidden aspect-[4/3] overflow-hidden md:block"
            aria-label={`Open photo ${i + 2} of ${images.length}: ${img.alt}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src(img.media_key, "sm")} alt={img.alt} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          </button>
        ))}
      </div>
      <button type="button" onClick={(e) => show(0, e.currentTarget)} className="btn-outline mt-3">
        <Icon name="grid" className="h-4 w-4" /> {images.length === 1 ? "View photo" : `View all ${images.length} photos`}
      </button>

      <dialog
        ref={dialog}
        onClose={close}
        onCancel={close}
        aria-label={`${name} photos`}
        className="m-0 h-full max-h-none w-full max-w-none bg-ink/95 p-0 text-white backdrop:bg-ink/80"
      >
        {open != null && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4">
              <p className="text-sm text-sand-200" aria-live="polite">
                {open + 1} / {images.length}
              </p>
              <button type="button" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close photos">
                <Icon name="x" />
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center px-4 pb-6 md:px-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={open}
                src={src(images[open].media_key, "lg")}
                alt={images[open].alt}
                className="max-h-full max-w-full animate-fade-in rounded-xl object-contain"
              />
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 md:left-6" aria-label="Previous photo">
                    <Icon name="chevronLeft" />
                  </button>
                  <button type="button" onClick={() => step(1)} className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 md:right-6" aria-label="Next photo">
                    <Icon name="chevronRight" />
                  </button>
                </>
              )}
            </div>
            <p className="px-4 pb-5 text-center text-sm text-sand-200">{images[open].alt}</p>
          </div>
        )}
      </dialog>
    </>
  );
}
