type ScreenshotPreviewCardProps = {
  title: string;
  caption: string;
  placeholderLabel?: string;
};

export default function ScreenshotPreviewCard({
  title,
  caption,
  placeholderLabel = "Preview",
}: ScreenshotPreviewCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        <div className="flex aspect-[16/9] items-center justify-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          {placeholderLabel}
        </div>
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{caption}</p>
      </div>
    </div>
  );
}
