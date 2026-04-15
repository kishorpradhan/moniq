"use client";

import Image from "next/image";
import { useState } from "react";

type ScreenshotPreviewCardProps = {
  title: string;
  caption: string;
  placeholderLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
};

export default function ScreenshotPreviewCard({
  title,
  caption,
  placeholderLabel = "Preview",
  imageSrc,
  imageAlt,
}: ScreenshotPreviewCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        {imageSrc ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full"
            aria-label={`Enlarge ${title} preview`}
          >
            <Image
              src={imageSrc}
              alt={imageAlt ?? title}
              width={1400}
              height={900}
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="aspect-[16/9] h-auto w-full object-cover"
            />
          </button>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {placeholderLabel}
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{caption}</p>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 rounded-full border border-white/40 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Close
            </button>
            <Image
              src={imageSrc!}
              alt={imageAlt ?? title}
              width={1400}
              height={900}
              sizes="100vw"
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
