"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Eye, Send, ListTodo } from "lucide-react";
import { getAgenda } from "@/lib/api";
import { fmtDate, humanize } from "@/components/workspace/ui";

type Row = { key: string; studentId: string; student: string; text: string; meta: string; late?: boolean };

function Column({ title, icon: Icon, rows, empty }: { title: string; icon: React.ElementType; rows: Row[]; empty: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 min-w-0">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
        <Icon size={16} className="text-primary" /> {title}
        <span className="ml-auto text-xs font-semibold text-slate-400">{rows.length}</span>
      </h3>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={`/students/${r.studentId}`} className="block rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-800 truncate">{r.text}</p>
              <p className={`text-xs truncate ${r.late ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                {r.student} · {r.meta}
              </p>
            </Link>
          </li>
        ))}
        {!rows.length && <li className="text-xs text-slate-400 px-2">{empty}</li>}
      </ul>
    </div>
  );
}

/** "Needs attention" panel backed by /api/agenda. */
export function Agenda() {
  const [a, setA] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getAgenda(14).then(setA).catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!a) return <div className="h-40 bg-white border border-slate-200 rounded-2xl animate-pulse" />;

  const deadlines: Row[] = [
    ...a.overdueStages.map((s: any) => ({ key: s.submissionId, studentId: s.studentId, student: s.student, text: s.stage, meta: `overdue since ${fmtDate(s.deadline)}`, late: true })),
    ...a.upcomingStages.map((s: any) => ({ key: s.submissionId, studentId: s.studentId, student: s.student, text: s.stage, meta: `due ${fmtDate(s.deadline)} · ${humanize(s.status)}` })),
  ];
  const reviews: Row[] = a.awaitingReview.map((s: any) => ({
    key: s.submissionId,
    studentId: s.studentId,
    student: s.student,
    text: s.stage,
    meta: s.submittedBy ? `submitted by ${s.submittedBy}` : "awaiting review",
  }));
  const deliveries: Row[] = a.plannedDeliveries.map((d: any) => ({
    key: d.deliveryId,
    studentId: d.studentId,
    student: d.student,
    text: d.title,
    meta: d.scheduledFor ? `send ${fmtDate(d.scheduledFor)}` : "unscheduled",
    late: d.overdue,
  }));
  const tasks: Row[] = a.openTasks.map((t: any) => ({
    key: t.taskId,
    studentId: t.studentId,
    student: t.student,
    text: t.title,
    meta: `${humanize(t.status)}${t.dueDate ? ` · due ${fmtDate(t.dueDate)}` : ""}`,
    late: t.overdue,
  }));

  return (
    <section aria-label="Needs attention" className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <AlertTriangle size={18} className="text-amber-500" /> Needs attention
        <span className="text-xs font-medium text-slate-400">next 14 days</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Column title="Stage deadlines" icon={CalendarClock} rows={deadlines} empty="No deadlines coming up." />
        <Column title="Awaiting peer review" icon={Eye} rows={reviews} empty="Nothing to review." />
        <Column title="Deliveries to send" icon={Send} rows={deliveries} empty="No planned deliveries." />
        <Column title="Open sprint tasks" icon={ListTodo} rows={tasks} empty="No open tasks." />
      </div>
    </section>
  );
}
