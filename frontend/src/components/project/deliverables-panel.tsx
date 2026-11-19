"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Send, Trash2, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  getProjectDeliverables,
  createProjectDeliverable,
  deleteProjectDeliverable,
  markDeliverableSent,
  updateDelivery,
  errorMessage,
  LinkInput,
} from "@/lib/api";
import { Card, StatusBadge, AddLinkForm, LinkChip, fmtDate, fmtDateTime, inputCls, btnPrimary, btnSecondary } from "@/components/workspace/ui";
import { cn } from "@/lib/utils";

function NewDeliverable({ projectId, onDone, onError }: { projectId: string; onDone: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ title: "", description: "", dueDate: "" });
  const [links, setLinks] = useState<LinkInput[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await createProjectDeliverable(projectId, { ...f, dueDate: f.dueDate || null, links });
          onDone();
        } catch (err) {
          onError(errorMessage(err, "Failed to add deliverable"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="md:col-span-2 text-xs font-bold text-slate-500">
          Deliverable *
          <input required className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Week 3 results pack" />
        </label>
        <label className="text-xs font-bold text-slate-500">
          Send by
          <input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
        </label>
        <label className="md:col-span-3 text-xs font-bold text-slate-500">
          Details
          <textarea rows={2} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
      </div>
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500">Links shared with every student (optional)</span>
        <div className="flex flex-wrap gap-2">
          {links.map((l, i) => (
            <LinkChip key={i} link={{ type: l.type || "OTHER", url: l.url }} onDelete={() => setLinks(links.filter((_, j) => j !== i))} />
          ))}
        </div>
        <AddLinkForm compact onAdd={async (l) => setLinks([...links, l])} />
      </div>
      <p className="text-xs text-slate-500">Every active student in this project gets this as a planned delivery.</p>
      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onDone}>
          Cancel
        </button>
        <button className={btnPrimary} disabled={busy || !f.title.trim()}>
          {busy && <Loader2 size={14} className="animate-spin" />} Add deliverable
        </button>
      </div>
    </form>
  );
}

export function DeliverablesPanel({ projectId, onError }: { projectId: string; onError: (m: string) => void }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getProjectDeliverables(projectId));
    } catch (e) {
      onError(errorMessage(e, "Failed to load deliverables"));
      setItems([]);
    }
  }, [projectId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      onError(errorMessage(e));
    }
    load();
  };

  return (
    <Card
      title="Project deliverables"
      action={
        !adding && (
          <button className={btnPrimary} onClick={() => setAdding(true)}>
            <Plus size={16} /> New deliverable
          </button>
        )
      }
    >
      <p className="text-xs text-slate-500 mb-4">Define something once for the whole project, then track which students have received it.</p>
      {adding && (
        <NewDeliverable
          projectId={projectId}
          onError={onError}
          onDone={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {items === null ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      ) : (
        <div className="space-y-3">
          {items.map((d) => {
            const pct = d.total ? Math.round((d.delivered / d.total) * 100) : 0;
            const isOpen = open === d.id;
            return (
              <div key={d.id} className={cn("rounded-xl border", d.overdue ? "border-rose-200" : "border-slate-200")}>
                <button className="w-full p-4 text-left flex flex-wrap items-center gap-3" onClick={() => setOpen(isOpen ? null : d.id)} aria-expanded={isOpen}>
                  <div className="flex-1 min-w-[12rem]">
                    <p className="font-bold text-slate-900">{d.title}</p>
                    <p className={cn("text-xs", d.overdue ? "text-rose-600 font-semibold" : "text-slate-500")}>
                      {d.dueDate ? `Send by ${fmtDate(d.dueDate)}` : "No date"}
                      {d.overdue && " · overdue"}
                    </p>
                  </div>
                  <div className="w-40">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>Delivered</span>
                      <span>
                        {d.delivered}/{d.total}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full", pct === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 p-4 space-y-3">
                    {d.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{d.description}</p>}
                    <ul className="divide-y divide-slate-100">
                      {d.students.map((s: any) => (
                        <li key={s.deliveryId} className="py-2 flex flex-wrap items-center gap-2">
                          <Link href={`/students/${s.studentId}`} className="flex-1 min-w-[10rem] text-sm font-semibold text-slate-800 hover:text-primary">
                            {s.student}
                          </Link>
                          <span className="text-xs text-slate-500">{s.sentAt ? `Sent ${fmtDateTime(s.sentAt)}` : ""}</span>
                          <StatusBadge status={s.status} />
                          {s.status === "PLANNED" && (
                            <button className={btnSecondary + " !py-1 !px-2.5 text-xs"} onClick={() => act(() => markDeliverableSent(d.id, { studentIds: [s.studentId] }))}>
                              <Send size={12} /> Sent
                            </button>
                          )}
                          {s.status === "SENT" && (
                            <button className={btnSecondary + " !py-1 !px-2.5 text-xs"} onClick={() => act(() => updateDelivery(s.deliveryId, { status: "ACKNOWLEDGED" }))}>
                              <CheckCircle2 size={12} /> Acknowledged
                            </button>
                          )}
                        </li>
                      ))}
                      {!d.students.length && <li className="py-2 text-sm text-slate-400">No students enrolled.</li>}
                    </ul>
                    <div className="flex flex-wrap gap-2 justify-between">
                      {d.delivered < d.total && (
                        <button className={btnPrimary} onClick={() => act(() => markDeliverableSent(d.id, {}))}>
                          <Send size={14} /> Mark sent to all remaining
                        </button>
                      )}
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-rose-600"
                        onClick={() => window.confirm(`Delete "${d.title}" for all students?`) && act(() => deleteProjectDeliverable(d.id))}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!items.length && !adding && <p className="text-sm text-slate-400">No project deliverables yet.</p>}
        </div>
      )}
    </Card>
  );
}
