"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { getDeliveries, updateDelivery, errorMessage } from "@/lib/api";
import { Card, ErrorBanner, LinkChip, StatusBadge, fmtDate, fmtDateTime, btnSecondary } from "@/components/workspace/ui";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "", label: "All" },
  { id: "PLANNED", label: "Planned" },
  { id: "SENT", label: "Sent" },
  { id: "ACKNOWLEDGED", label: "Acknowledged" },
];

export default function DeliveriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await getDeliveries(status ? { status } : undefined));
    } catch (e) {
      setError(errorMessage(e, "Failed to load deliveries"));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, next: string) => {
    setError("");
    try {
      await updateDelivery(id, { status: next });
    } catch (e) {
      setError(errorMessage(e));
    }
    load();
  };

  const now = new Date();
  const planned = items.filter((d) => d.status === "PLANNED");
  const overdue = planned.filter((d) => d.scheduledFor && new Date(d.scheduledFor) < now).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Deliveries</h1>
        <p className="text-slate-500 mt-1">
          Documents and results sent to students, and what is planned to go out next.
          {overdue > 0 && <span className="text-rose-600 font-semibold"> {overdue} planned deliveries are overdue.</span>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={status === f.id}
            onClick={() => {
              setLoading(true);
              setStatus(f.id);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-semibold border",
              status === f.id ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} onClose={() => setError("")} />

      <Card>
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing here yet. Log deliveries from a student&apos;s page, or ask Claude via MCP: &quot;log that I sent Sruthi the week 3 notebook&quot;.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((d) => {
              const late = d.status === "PLANNED" && d.scheduledFor && new Date(d.scheduledFor) < now;
              return (
                <div key={d.id} className="py-4 flex flex-col md:flex-row md:items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/students/${d.student.id}`} className="text-xs font-bold text-primary hover:underline">
                        {d.student.name}
                      </Link>
                      {d.submission && <span className="text-xs text-slate-400">· {d.submission.submissionTemplate.name}</span>}
                    </div>
                    <p className="font-bold text-slate-900">{d.title}</p>
                    <p className={cn("text-xs", late ? "text-rose-600 font-semibold" : "text-slate-500")}>
                      {d.status === "PLANNED"
                        ? `Planned for ${fmtDate(d.scheduledFor)}${late ? " · overdue" : ""}`
                        : `Sent ${fmtDateTime(d.sentAt)}${d.channel ? ` via ${d.channel}` : ""}`}
                    </p>
                    {d.links.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {d.links.map((l: any) => (
                          <LinkChip key={l.id} link={l} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={d.status} />
                    {d.status === "PLANNED" && (
                      <button className={btnSecondary} onClick={() => act(d.id, "SENT")}>
                        <Send size={14} /> Mark sent
                      </button>
                    )}
                    {d.status === "SENT" && (
                      <button className={btnSecondary} onClick={() => act(d.id, "ACKNOWLEDGED")}>
                        <CheckCircle2 size={14} /> Acknowledged
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
