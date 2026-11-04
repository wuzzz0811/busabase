"use client";

import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "kui/dialog";
import { Download, ExternalLink, FileText, Film, Music, RotateCcw } from "lucide-react";
import { Fragment, type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { useCoreI18n } from "../../../i18n";
import { buildAssetDownloadUrl } from "../../assets/utils/asset-content-url";
import { attachmentGridLayout } from "../helpers/attachment-grid-layout";
import { getAttachmentRefs, getSafeAttachmentUrl } from "../helpers/field";
import { AssetMediaPreview } from "./assets";
import { DialogContent } from "./localized-dialog-content";

type Attachment = ReturnType<typeof getAttachmentRefs>[number];

function FileIcon({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith("video/")
    ? Film
    : mimeType.startsWith("audio/")
      ? Music
      : FileText;
  return <Icon aria-hidden className="size-3.5 shrink-0" />;
}

/** Keep a failed image identifiable and recoverable, without changing a signed URL. */
function AttachmentImage({
  item,
  url,
  large = false,
  grid = false,
  onOpen,
}: {
  item: Attachment;
  url: string;
  large?: boolean;
  grid?: boolean;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const messages = useCoreI18n();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const image = failed ? (
    <span className="flex max-w-full items-center gap-1.5 px-2 text-xs">
      <FileIcon mimeType={item.mimeType} />
      <span className="truncate">{item.fileName}</span>
    </span>
  ) : (
    <img
      alt={item.fileName}
      className={`h-full w-full object-contain ${loaded ? "" : "opacity-0"}`}
      decoding="async"
      draggable={false}
      key={attempt}
      loading={large ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      src={url}
    />
  );
  const frameClass = `relative flex items-center justify-center overflow-hidden rounded border bg-muted/40 ${large ? "h-[55vh] w-full" : grid ? "size-[32px] shrink-0" : failed ? "h-12 w-40 max-w-full" : "h-12 w-16"}`;
  return (
    <div
      className={`relative flex min-w-0 ${large ? "w-full flex-col" : grid ? "size-[32px] shrink-0" : "max-w-48"} items-center gap-1`}
    >
      {onOpen ? (
        <a
          aria-label={item.fileName}
          className={`${frameClass} hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          draggable={false}
          href={url}
          onClick={onOpen}
          rel="noreferrer"
          target="_blank"
          title={item.fileName}
        >
          {image}
          {!failed && !loaded ? (
            <span aria-hidden className="absolute inset-0 animate-pulse bg-muted" />
          ) : null}
        </a>
      ) : (
        <div className={frameClass}>
          {image}
          {!failed && !loaded ? (
            <span aria-hidden className="absolute inset-0 animate-pulse bg-muted" />
          ) : null}
        </div>
      )}
      {failed ? (
        <button
          aria-label={`${messages.nodeDetail.filePreviewRetry}: ${item.fileName}`}
          className={`${grid ? "absolute right-0 bottom-0 bg-background p-0.5" : "p-1"} inline-flex shrink-0 items-center gap-1 rounded text-muted-foreground text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          onClick={(event) => {
            event.stopPropagation();
            setFailed(false);
            setLoaded(false);
            setAttempt((current) => current + 1);
          }}
          title={messages.nodeDetail.filePreviewUnavailable}
          type="button"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          {large ? messages.nodeDetail.filePreviewRetry : null}
        </button>
      ) : null}
    </div>
  );
}

/** Attachment fields share ordering, safe addresses and a keyboard-accessible preview. */
export function AttachmentValuePreview({
  value,
  compact = false,
  className = "",
  renderTrigger,
  resolveUrl = getSafeAttachmentUrl,
  minimalChrome = false,
  presentation = "flow",
}: {
  value: unknown;
  compact?: boolean;
  /** Grid rows have a fixed 48px height; flow remains compatible with detail/cards. */
  presentation?: "flow" | "grid";
  className?: string;
  /** Reuse this preview with a host-owned chip instead of the default thumbnail/link. */
  renderTrigger?: (
    item: Attachment,
    onOpen: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void,
  ) => ReactNode;
  /** Override only for trusted local files; stored fields keep the safe URL resolver. */
  resolveUrl?: (item: Attachment) => string | null;
  /**
   * Drop the generic "File preview" subtitle and the single-file switcher
   * chip that otherwise repeats the dialog title. Opt-in so existing
   * dashboard/record-detail callers keep their current dialog unchanged.
   */
  minimalChrome?: boolean;
}) {
  const messages = useCoreI18n();
  const attachments = getAttachmentRefs(value);
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const grid = presentation === "grid";
  const hasAttachments = attachments.length > 0;
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!grid || !hasAttachments || !container.current) return;
    const element = container.current;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [grid, hasAttachments]);
  // Resource IDs identify assets, not their repeated occurrences in a lookup result.
  const occurrences = new Map<string, number>();
  const entries = attachments.map((item) => {
    const ordinal = occurrences.get(item.id) ?? 0;
    occurrences.set(item.id, ordinal + 1);
    return { item, key: JSON.stringify([item.id, ordinal]) };
  });
  const opener = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const selectedEntry = entries.find((entry) => entry.key === selectedKey) ?? entries[0];
  const selected = selectedEntry?.item;
  const selectedUrl = selected ? resolveUrl(selected) : null;
  const layout = attachmentGridLayout(
    width,
    attachments.map((item) => (resolveUrl(item) && item.mimeType.startsWith("image/") ? 32 : 128)),
  );
  const visible = grid ? entries.slice(0, layout.visible) : compact ? entries.slice(0, 3) : entries;
  if (attachments.length === 0) return <span className="text-muted-foreground">-</span>;

  const openAttachment = (
    event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    key: string,
  ) => {
    // Keep normal browser link affordances for modified clicks.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    event.stopPropagation();
    opener.current = event.currentTarget;
    setSelectedKey(key);
    setOpen(true);
  };

  return (
    <>
      <div
        className={`flex min-w-0 items-center ${grid ? "h-[32px] w-full flex-nowrap gap-[6px]" : "flex-wrap gap-1.5"} ${className}`}
        data-attachment-preview
        data-attachment-presentation={presentation}
        data-attachment-count={attachments.length}
        data-attachment-visible-count={visible.length}
        ref={container}
        tabIndex={-1}
      >
        {visible.map(({ item, key }) => {
          if (renderTrigger) {
            return (
              <Fragment key={key}>
                {renderTrigger(item, (event) => openAttachment(event, key))}
              </Fragment>
            );
          }
          const url = resolveUrl(item);
          if (url && item.mimeType.startsWith("image/")) {
            return (
              <AttachmentImage
                item={item}
                grid={grid}
                key={`${key}:${url}`}
                onOpen={(event) => openAttachment(event, key)}
                url={url}
              />
            );
          }
          const content = (
            <>
              <FileIcon mimeType={item.mimeType} />
              <span className="truncate">{item.fileName}</span>
            </>
          );
          const chipClass = `${grid ? "h-[32px] w-[128px] shrink-0" : "max-w-48"} inline-flex min-w-0 items-center gap-1.5 rounded border bg-card px-2 py-1 text-xs`;
          return url ? (
            <a
              className={`${chipClass} text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              draggable={false}
              href={url}
              key={key}
              onClick={(event) => openAttachment(event, key)}
              rel="noreferrer"
              target="_blank"
              title={item.fileName}
            >
              {content}
            </a>
          ) : (
            <span className={chipClass} key={key} title={item.fileName}>
              {content}
            </span>
          );
        })}
        {(compact || grid) && attachments.length > visible.length ? (
          <button
            aria-label={`${messages.common.open}: ${attachments.length} ${messages.common.items}`}
            className={`${grid ? "h-[32px] max-w-full min-w-0 shrink-0 overflow-hidden px-[4px] text-[12px] tabular-nums" : "px-2 text-xs"} rounded border py-1 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            data-attachment-overflow
            style={
              grid
                ? { width: Math.min(layout.overflowWidth, width || layout.overflowWidth) }
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              opener.current = event.currentTarget;
              setSelectedKey(entries[visible.length]?.key ?? null);
              setOpen(true);
            }}
            type="button"
          >
            {grid && visible.length === 0
              ? attachments.length
              : `+${attachments.length - visible.length}`}
          </button>
        ) : null}
      </div>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          {...(minimalChrome ? { "aria-describedby": undefined } : {})}
          className="flex max-h-[90vh] max-w-4xl flex-col overflow-y-auto"
          data-testid="attachment-preview-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (opener.current?.isConnected ? opener.current : container.current)?.focus({
              preventScroll: true,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle className="break-all pr-6">
              {selected?.fileName ?? messages.nodeDetail.filePreviewTitle}
            </DialogTitle>
            {minimalChrome ? null : (
              <DialogDescription>{messages.nodeDetail.filePreviewTitle}</DialogDescription>
            )}
          </DialogHeader>
          {attachments.length > 1 ? (
            <p
              className="text-muted-foreground text-xs tabular-nums"
              data-attachment-position
              aria-live="polite"
            >
              {entries.indexOf(selectedEntry) + 1} / {attachments.length}
            </p>
          ) : null}
          {minimalChrome && attachments.length <= 1 ? null : (
            <div className="flex flex-wrap gap-1.5">
              {entries.map(({ item, key }, index) => (
                <button
                  aria-pressed={key === selectedEntry?.key}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded border px-2 py-1 text-xs ${key === selectedEntry?.key ? "border-primary bg-primary/10" : "hover:bg-accent"}`}
                  data-attachment-index={index}
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  title={item.fileName}
                  type="button"
                >
                  <FileIcon mimeType={item.mimeType} />
                  <span className="truncate">{item.fileName}</span>
                </button>
              ))}
            </div>
          )}
          {selected && selectedUrl ? (
            <>
              {selected.mimeType.startsWith("image/") ? (
                <AttachmentImage
                  item={selected}
                  key={`${selected.id}:${selectedUrl}`}
                  large
                  url={selectedUrl}
                />
              ) : (
                <AssetMediaPreview
                  mediaClassName="max-h-[55vh] w-full object-contain"
                  mimeType={selected.mimeType}
                  name={selected.fileName}
                  url={selectedUrl}
                />
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                <a
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  href={selectedUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden className="size-4" />
                  {messages.nodeDetail.openFileInNewTab}
                </a>
                <a
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  download={selected.fileName}
                  href={
                    selected.assetId
                      ? buildAssetDownloadUrl(selected.assetId, selected.fileName)
                      : selectedUrl
                  }
                >
                  <Download aria-hidden className="size-4" />
                  {messages.nodeDetail.downloadFile}
                </a>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              {messages.nodeDetail.filePreviewUnavailable}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
