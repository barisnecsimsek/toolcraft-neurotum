"use client";

import * as React from "react";
import { CloudArrowUpIcon, PlusIcon, XIcon } from "@phosphor-icons/react";

import { cn } from "../../../lib/utils";
import { Button, Field } from "../../primitives";

export type FileDropPreview = {
  alt?: string;
  id?: string;
  size?: {
    height: number;
    width: number;
  };
  src: string;
};

export type FileDropControlProps = {
  accept: string;
  multiple?: boolean;
  onClear?: () => void;
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  onPreviewRemove?: (preview: FileDropPreview, index: number) => void;
  preview?: FileDropPreview;
  previews?: readonly FileDropPreview[];
};

function isDragLeavingCurrentTarget(event: React.DragEvent<HTMLElement>): boolean {
  const nextTarget = event.relatedTarget;

  return !(nextTarget instanceof Node && event.currentTarget.contains(nextTarget));
}

function getFileInputAccept(accept: string): string {
  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .flatMap((part) => {
      switch (part) {
        case "gif":
          return [".gif", "image/gif"];
        case "heic":
          return [".heic", "image/heic"];
        case "heif":
          return [".heif", "image/heif"];
        case "jpg":
        case "jpeg":
          return [".jpg", ".jpeg", "image/jpeg"];
        case "png":
          return [".png", "image/png"];
        case "svg":
          return [".svg", "image/svg+xml"];
        case "tif":
        case "tiff":
          return [".tif", ".tiff", "image/tiff"];
        case "webp":
          return [".webp", "image/webp"];
        default:
          return part.startsWith(".") || part.includes("/") ? [part] : [];
      }
    })
    .join(",");
}

function getPreviewImageStyle(size: FileDropPreview["size"]): React.CSSProperties {
  if (!size || size.height <= 0 || size.width <= 0) {
    return { width: "100%" };
  }

  const maxWidth = Math.max(1, (196 * size.width) / size.height);

  return {
    width: `min(100%, ${maxWidth.toFixed(2)}px)`,
  };
}

export function FileDropControl({
  accept,
  multiple = false,
  onClear,
  onFileSelect,
  onFilesSelect,
  onPreviewRemove,
  preview,
  previews,
}: FileDropControlProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const previewItems = previews ?? (preview ? [preview] : []);
  const hasPreview = previewItems.some((item) => Boolean(item.src));
  const shouldRenderPreviewGrid = multiple && previewItems.length > 1;

  function handleFiles(fileList: FileList | readonly File[] | undefined): void {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) {
      return;
    }

    if (multiple) {
      if (onFilesSelect) {
        onFilesSelect(files);
        return;
      }

      files.forEach((file) => onFileSelect?.(file));
      return;
    }

    onFileSelect?.(files[0]);
  }

  function openFileDialog(): void {
    inputRef.current?.click();
  }

  function handleDropTargetKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openFileDialog();
  }

  return (
    <Field className="min-w-0 gap-2">
      <input
        accept={getFileInputAccept(accept)}
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.currentTarget.files ?? undefined);
          event.currentTarget.value = "";
        }}
        multiple={multiple}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <div
        aria-label={
          hasPreview
            ? multiple
              ? "Drop image files"
              : "Replace image file"
            : multiple
              ? "Browse image files"
              : "Browse image file"
        }
        className={cn(
          "group/file-upload relative flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[color:color-mix(in_oklab,var(--border)_18%,transparent)] bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] text-center shadow-none transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[color:color-mix(in_oklab,var(--border)_35%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] data-[drag-over=true]:border-[color:color-mix(in_oklab,var(--link)_28%,transparent)] data-[drag-over=true]:bg-[color:color-mix(in_oklab,var(--link)_13%,transparent)] data-[drag-over=true]:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
          hasPreview ? "overflow-hidden p-2" : "px-3 py-3",
        )}
        data-drag-over={dragOver}
        onClick={openFileDialog}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (isDragLeavingCurrentTarget(event)) {
            setDragOver(false);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFiles(event.dataTransfer?.files ?? undefined);
        }}
        onKeyDown={handleDropTargetKeyDown}
        role="button"
        tabIndex={0}
      >
        {shouldRenderPreviewGrid ? (
          <div
            className="grid w-full grid-cols-4 gap-2"
            data-slot="file-upload-preview-grid"
          >
            {previewItems.map((item, index) => (
              <div
                className="relative aspect-square min-w-0 overflow-hidden rounded-[calc(var(--radius-lg)-4px)] bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]"
                data-slot="file-upload-preview-item"
                key={item.id ?? `${item.src}-${index}`}
              >
                <img
                  alt={item.alt ?? ""}
                  className="size-full object-cover"
                  draggable={false}
                  height={item.size?.height}
                  src={item.src}
                  width={item.size?.width}
                />
                {onPreviewRemove ? (
                  <Button
                    aria-label={`Remove ${item.alt ?? "image"}`}
                    className="absolute top-1 right-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPreviewRemove(item, index);
                    }}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon className="drop-shadow-[0_2px_1px_color-mix(in_oklab,var(--background)_80%,transparent)]" />
                  </Button>
                ) : null}
              </div>
            ))}
            <button
              aria-label="Add image files"
              className="flex aspect-square min-w-0 items-center justify-center rounded-[calc(var(--radius-lg)-4px)] border border-[color:color-mix(in_oklab,var(--border)_5%,transparent)] bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)] text-[color:color-mix(in_oklab,var(--foreground)_65%,transparent)] transition-[background-color,border-color,color] duration-150 ease-out hover:border-[color:color-mix(in_oklab,var(--border)_35%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_7%,transparent)] hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              data-slot="file-upload-add-preview"
              onClick={(event) => {
                event.stopPropagation();
                openFileDialog();
              }}
              type="button"
            >
              <PlusIcon className="size-4" weight="regular" />
            </button>
          </div>
        ) : hasPreview ? (
          <>
            {previewItems[0] ? (
              <img
                alt={previewItems[0].alt ?? ""}
                className="block h-auto max-h-[196px] max-w-full rounded-[calc(var(--radius-lg)-4px)] object-contain"
                draggable={false}
                height={previewItems[0].size?.height}
                src={previewItems[0].src}
                style={getPreviewImageStyle(previewItems[0].size)}
                width={previewItems[0].size?.width}
              />
            ) : null}
            {onClear ? (
              <Button
                aria-label="Remove image"
                className="absolute top-3 right-3"
                onClick={(event) => {
                  event.stopPropagation();
                  onClear();
                }}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <XIcon className="drop-shadow-[0_2px_1px_color-mix(in_oklab,var(--background)_80%,transparent)]" />
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <CloudArrowUpIcon
              className="size-6 flex-none text-[color:var(--muted-foreground)] transition-colors duration-150 ease-out group-data-[drag-over=true]/file-upload:text-[color:var(--link)]"
              weight="light"
            />
            <p className="m-0 flex max-w-full flex-col text-xs leading-tight text-[color:color-mix(in_oklab,var(--foreground)_60%,transparent)] transition-colors duration-150 ease-out group-hover/file-upload:text-[color:color-mix(in_oklab,var(--foreground)_85%,transparent)] group-data-[drag-over=true]/file-upload:text-[color:var(--link)]">
              <span>Click to upload an image</span>
              <span>or drag it onto the canvas</span>
            </p>
          </>
        )}
      </div>
    </Field>
  );
}
