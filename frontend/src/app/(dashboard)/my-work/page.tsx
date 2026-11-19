"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2, Eye, Send, CalendarClock, PoundSterling, Hourglass, UserCheck } from "lucide-react";
import {
  getMyWork,
  createTask,
  updateTask,
  deleteTask,
  getMscProjects,
  getStudents,
  getAdmins,
  getCurrentUser,
  updateDelivery,
  updateOutsourcingExpense,
  errorMessage,
} from "@/lib/api";
import { Card, ErrorBanner, fmtDate, humanize, inputCls, btnPrimary, btnSecondary } from "@/components/workspace/ui";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { cn } from "@/lib/utils";

const COLUMNS = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
const COLUMN_STYLE: Record<string, string> = {
  TODO: "bg-slate-50",
  IN_PROGRESS: "bg-blue-50/60",
  BLOCKED: "bg-rose-50/60",
  DONE: "bg-emerald-50/60",
};

function SideList({ title, icon: Icon, items, empty }: { title: string; icon: React.ElementType; items: React.ReactNode[]; empty: string }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2 text-sm">
          <Icon size={16} className="text-primary" /> {title}
          <span className="text-xs font-semibold text-slate-400">{items.length}</span>
        </span>
      }
    >
      <ul className="space-y-2 max-h-72 overflow-y-auto -mt-1">
        {items.length ? items : <li className="text-xs text-slate-400">{empty}</li>}
      </ul>
    </Card>
  );
}

export default function MyWorkPage() {
  const { formatPrice } = useCurrencyStore();
  const me = getCurrentUser();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [w, setW] = useState<any>(null);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", mscProjectId: "", studentId: "", dueDate: "", assigneeAdminId: me?.id || "" });
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setW(await getMyWork(scope));
    } catch (e) {
      setError(errorMessage(e, "Failed to load your work"));
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([getMscProjects(), getStudents(), getAdmins()])
      .then(([p, s, a]) => {
        setProjects(p);
        setStudents(s);
        setAdmins(a);
      })
      .catch(() => {});
  }, []);

  const act = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
    load();
  };

  const move = (t: any, dir: -1 | 1) => {
    const i = COLUMNS.indexOf(t.status);
    const next = COLUMNS[i + dir];
    if (next) act(() => updateTask(t.id, { status: next }));
  };

  if (!w) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const projectStudents = students.filter((s) => !f.mscProjectId || s.mscProjectId === f.mscProjectId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My work</h1>
          <p className="text-slate-500 mt-1">Your tasks across all projects and students, plus everything waiting on you.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-sm font-semibold" role="tablist" aria-label="Whose work">
            {(["mine", "all"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={scope === k} onClick={() => setScope(k)} className={cn("px-3 py-1.5 rounded-lg", scope === k ? "bg-white shadow-sm text-primary" : "text-slate-500")}>
                {k === "mine" ? "Mine" : "Everyone"}
              </button>
            ))}
          </div>
          {!adding && (
            <button className={btnPrimary} onClick={() => setAdding(true)}>
              <Plus size={16} /> Add task
            </button>
          )}
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError("")} />

      {adding && (
        <form
          className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            await act(() =>
              createTask({
                title: f.title,
                studentId: f.studentId || null,
                mscProjectId: f.mscProjectId || null,
                dueDate: f.dueDate || null,
                assigneeAdminId: f.assigneeAdminId || null,
              })
            );
            setF({ ...f, title: "", studentId: "", dueDate: "" });
            setAdding(false);
          }}
        >
          <label className="md:col-span-2 text-xs font-bold text-slate-500">
            Task *
            <input required autoFocus className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Prepare viva slides template" />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Project
            <select className={inputCls} value={f.mscProjectId} onChange={(e) => setF({ ...f, mscProjectId: e.target.value, studentId: "" })}>
              <option value="">General</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Student
            <select className={inputCls} value={f.studentId} onChange={(e) => setF({ ...f, studentId: e.target.value })}>
              <option value="">—</option>
              {projectStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {!f.mscProjectId ? ` (${s.mscProjectName})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Due
            <input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Assign to
            <select className={inputCls} value={f.assigneeAdminId} onChange={(e) => setF({ ...f, assigneeAdminId: e.target.value })}>
              <option value="">Anyone</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-6 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button className={btnPrimary} disabled={!f.title.trim()}>
              Add task
            </button>
          </div>
        </form>
      )}

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const tasks = w.tasks.filter((t: any) => t.status === col);
          return (
            <section
              key={col}
              aria-label={humanize(col)}
              className={cn("rounded-2xl p-3 min-h-[12rem] border border-slate-200", COLUMN_STYLE[col])}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) act(() => updateTask(dragId, { status: col }));
                setDragId(null);
              }}
            >
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center justify-between">
                {humanize(col)} <span className="text-xs text-slate-400">{tasks.length}</span>
              </h2>
              <div className="space-y-2">
                {tasks.map((t: any) => (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm cursor-grab active:cursor-grabbing"
                  >
                    <p className={cn("text-sm font-semibold text-slate-900", col === "DONE" && "line-through text-slate-400")}>{t.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.student ? (
                        <Link href={`/students/${t.student.id}`} className="hover:text-primary font-medium">
                          {t.student.name}
                        </Link>
                      ) : (
                        t.project?.name || "General"
                      )}
                      {t.dueDate && <span className={t.overdue ? " text-rose-600 font-semibold" : ""}> · due {fmtDate(t.dueDate)}</span>}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-slate-400">{t.assignee ? t.assignee.name : "Unassigned"}</span>
                      <div className="flex items-center">
                        {!t.assignee && me && (
                          <button onClick={() => act(() => updateTask(t.id, { assigneeAdminId: me.id }))} className="p-1 text-slate-400 hover:text-primary" title="Assign to me" aria-label="Assign to me">
                            <UserCheck size={14} />
                          </button>
                        )}
                        <button onClick={() => move(t, -1)} disabled={col === "TODO"} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30" aria-label="Move left">
                          <ChevronLeft size={14} />
                        </button>
                        <button onClick={() => move(t, 1)} disabled={col === "DONE"} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30" aria-label="Move right">
                          <ChevronRight size={14} />
                        </button>
                        <button onClick={() => window.confirm(`Delete "${t.title}"?`) && act(() => deleteTask(t.id))} className="p-1 text-slate-400 hover:text-rose-600" aria-label="Delete task">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {!tasks.length && <p className="text-xs text-slate-400 px-1">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>

      {/* Waiting on me */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SideList
          title={scope === "mine" ? "Ready for my review" : "Awaiting review"}
          icon={Eye}
          empty="Nothing to review."
          items={w.toReview.map((r: any) => (
            <li key={r.submissionId}>
              <Link href={`/students/${r.studentId}`} className="block rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-800">
                  {r.student} · {r.stage}
                </p>
                <p className="text-xs text-slate-500">
                  {r.project}
                  {r.submittedBy && ` · submitted by ${r.submittedBy}`}
                </p>
              </Link>
            </li>
          ))}
        />
        <SideList
          title="Deliveries to send (7 days)"
          icon={Send}
          empty="No deliveries due."
          items={w.deliveriesToSend.map((d: any) => (
            <li key={d.deliveryId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
              <Link href={`/students/${d.studentId}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{d.title}</p>
                <p className={cn("text-xs", d.overdue ? "text-rose-600 font-semibold" : "text-slate-500")}>
                  {d.student} · {d.scheduledFor ? fmtDate(d.scheduledFor) : "no date"}
                </p>
              </Link>
              <button className="text-xs font-bold text-primary hover:underline shrink-0" onClick={() => act(() => updateDelivery(d.deliveryId, { status: "SENT" }))}>
                Sent
              </button>
            </li>
          ))}
        />
        <SideList
          title="Stage deadlines (7 days)"
          icon={CalendarClock}
          empty="No deadlines this week."
          items={w.deadlines.map((d: any) => (
            <li key={d.submissionId}>
              <Link href={`/students/${d.studentId}`} className="block rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-800">
                  {d.student} · {d.stage}
                </p>
                <p className={cn("text-xs", d.overdue ? "text-rose-600 font-semibold" : "text-slate-500")}>
                  {d.overdue ? "Overdue since " : "Due "}
                  {fmtDate(d.deadline)} · {humanize(d.status)}
                </p>
              </Link>
            </li>
          ))}
        />
        {scope === "mine" && (
          <SideList
            title="My submissions waiting on others"
            icon={Hourglass}
            empty="Nothing waiting."
            items={w.waitingOnOthers.map((r: any) => (
              <li key={r.submissionId}>
                <Link href={`/students/${r.studentId}`} className="block rounded-lg px-2 py-1.5 hover:bg-slate-50 text-sm font-semibold text-slate-800">
                  {r.student} · {r.stage}
                </Link>
              </li>
            ))}
          />
        )}
        <SideList
          title="Vendors still to pay"
          icon={PoundSterling}
          empty="All vendors paid."
          items={w.unpaidExpenses.map((e: any) => (
            <li key={e.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {e.paidTo} · {formatPrice(e.amount)}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {e.project.name}
                  {e.student && ` · ${e.student}`}
                  {e.description && ` · ${e.description}`}
                </p>
              </div>
              <button className="text-xs font-bold text-primary hover:underline shrink-0" onClick={() => act(() => updateOutsourcingExpense(e.id, { status: "PAID" }))}>
                Mark paid
              </button>
            </li>
          ))}
        />
      </div>
    </div>
  );
}
