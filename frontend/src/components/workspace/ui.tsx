"use client";

import React, { useState } from "react";
import {
  GitBranch,
  FileText,
  Presentation,
  NotebookPen,
  Database,
  FolderOpen,
  FileCheck,
  Link2,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LINK_TYPES, LinkInput } from "@/lib/api";

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

/** yyyy-mm-dd for <input type="date"> */
export const toInputDate = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  TODO: "bg-slate-100 text-slate-600",
  PLANNED: "bg-amber-50 text-amber-700",
  SUBMITTED: "bg-blue-50 text-blue-700",
  IN_REVIEW: "bg-indigo-50 text-indigo-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700",
  BLOCKED: "bg-rose-50 text-rose-700",
  APPROVED: "bg-teal-50 text-teal-700",
  SHARED_WITH_STUDENT: "bg-cyan-50 text-cyan-700",
  SENT: "bg-cyan-50 text-cyan-700",
  FEEDBACK_RECEIVED: "bg-violet-50 text-violet-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  DONE: "bg-emerald-50 text-emerald-700",
  ACKNOWLEDGED: "bg-emerald-50 text-emerald-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ON_HOLD: "bg-amber-50 text-amber-700",
  DROPPED: "bg-rose-50 text-rose-700",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide whitespace-nowrap",
        STATUS_STYLES[status] || "bg-slate-100 text-slate-600",
        className
      )}
    >
      {humanize(status)}
    </span>
  );
}

const LINK_ICONS: Record<string, React.ElementType> = {
  GITHUB: GitBranch,
  GOOGLE_DOC: FileText,
  PPT: Presentation,
  COLAB: NotebookPen,
  DATASET: Database,
  DRIVE: FolderOpen,
  REPORT: FileCheck,
  OTHER: Link2,
};

export const LINK_LABELS: Record<string, string> = {
  GITHUB: "GitHub",
  GOOGLE_DOC: "Google Doc",
  PPT: "PPT",
  COLAB: "Colab",
  DATASET: "Dataset",
  DRIVE: "Drive",
  REPORT: "Report",
  OTHER: "Link",
};

const isUrl = (u: string) => /^https?:\/\//i.test(u);

export function LinkChip({
  link,
  onDelete,
}: {
  link: { id?: string; type: string; url: string; label?: string | null };
  onDelete?: () => void;
}) {
  const Icon = LINK_ICONS[link.type] || Link2;
  const typeLabel = LINK_LABELS[link.type] || "Link";
  const useLabel = link.label && link.label !== link.url && link.label.toLowerCase() !== typeLabel.toLowerCase();
  const text = useLabel ? link.label! : link.url.replace(/^https?:\/\/(www\.)?/, "");
  const inner = (
    <>
      <Icon size={14} className="shrink-0" />
      <span className="font-bold shrink-0">{typeLabel}</span>
      <span className="truncate text-slate-500 font-medium">{text}</span>
    </>
  );
  return (
    <span className="inline-flex items-center gap-1 max-w-full bg-white border border-slate-200 rounded-lg pl-2 pr-1 py-1 text-xs text-slate-700">
      {isUrl(link.url) ? (
        <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-w-0 hover:text-primary">
          {inner}
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 min-w-0" title="Not a URL — stored as a file name">
          {inner}
        </span>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Remove link"
          className="p-0.5 rounded hover:bg-rose-50 hover:text-rose-600 text-slate-400"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

/** Inline form to add one typed link. */
export function AddLinkForm({
  onAdd,
  compact,
  defaultType,
}: {
  onAdd: (link: LinkInput) => Promise<unknown>;
  compact?: boolean;
  defaultType?: string;
}) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState(defaultType || "");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  // Not a <form>: this editor is embedded inside other forms (e.g. the delivery form),
  // and nested forms make Enter submit the outer one.
  const submit = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd({ url: url.trim(), type: type || undefined, label: label.trim() || undefined });
      setUrl("");
      setLabel("");
    } finally {
      setBusy(false);
    }
  };
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-primary"
        aria-label="Link type"
      >
        <option value="">Auto-detect</option>
        {LINK_TYPES.map((t) => (
          <option key={t} value={t}>
            {LINK_LABELS[t]}
          </option>
        ))}
      </select>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={onEnter}
        placeholder="https://github.com/... or docs.google.com/..."
        className="flex-1 min-w-[12rem] px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary"
        aria-label="Link URL"
      />
      {!compact && (
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={onEnter}
          placeholder="Label (optional)"
          className="w-36 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary"
          aria-label="Link label"
        />
      )}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !url.trim()}
        className="inline-flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Add
      </button>
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-white border border-slate-200 rounded-2xl p-5 md:p-6", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-[60] flex items-start justify-between gap-3 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 shadow-lg"
    >
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export const inputCls =
  "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark disabled:opacity-50 transition-colors";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors";
