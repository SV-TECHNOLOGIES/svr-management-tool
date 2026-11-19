"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Phone,
  Mail,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  Ban,
  Plus,
  Trash2,
  Send,
  MessageSquareText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getStudentWorkspace,
  updateStudent,
  addStudentLink,
  addStudentNote,
  addSubmissionLink,
  deleteLink,
  updateSubmissionFile,
  reviewSubmission,
  updateShareStatus,
  recordStudentFeedback,
  updateSubmissionStatus,
  setSubmissionDeadline,
  addSubmissionNote,
  createTask,
  updateTask,
  deleteTask,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  errorMessage,
  LinkInput,
} from "@/lib/api";
import {
  AddLinkForm,
  Card,
  ErrorBanner,
  LinkChip,
  StatusBadge,
  LINK_LABELS,
  fmtDate,
  fmtDateTime,
  toInputDate,
  humanize,
  inputCls,
  btnPrimary,
  btnSecondary,
} from "@/components/workspace/ui";
import { cn } from "@/lib/utils";
import { useCurrencyStore } from "@/store/useCurrencyStore";

const SUBMISSION_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SHARED_WITH_STUDENT",
  "FEEDBACK_RECEIVED",
  "COMPLETED",
];
const TASK_NEXT: Record<string, string> = { TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO", BLOCKED: "IN_PROGRESS" };
const TASK_ICON: Record<string, React.ElementType> = { TODO: Circle, IN_PROGRESS: CircleDot, DONE: CheckCircle2, BLOCKED: Ban };

type Run = (fn: () => Promise<unknown>) => Promise<void>;

/* -------------------------------------------------------------------------- */
/* Stage card: links, lifecycle actions, notes                                 */
/* -------------------------------------------------------------------------- */
function StageCard({ sub, run }: { sub: any; run: Run }) {
  const [open, setOpen] = useState(sub.status !== "COMPLETED" && sub.status !== "PENDING");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const t = sub.submissionTemplate;

  const actions: React.ReactNode[] = [];
  if (["PENDING", "CHANGES_REQUESTED"].includes(sub.status)) {
    actions.push(
      <button key="submit" className={btnPrimary} disabled={!sub.links.length} title={!sub.links.length ? "Add a link first" : ""} onClick={() => run(() => updateSubmissionFile(sub.id, {}))}>
        Mark submitted for review
      </button>
    );
  }
  if (["SUBMITTED", "IN_REVIEW"].includes(sub.status)) {
    actions.push(
      <button key="approve" className={btnPrimary} onClick={() => run(() => reviewSubmission(sub.id, { action: "APPROVE", reviewNotes: text || undefined })).then(() => setText(""))}>
        Approve
      </button>,
      <button
        key="changes"
        className={btnSecondary}
        disabled={!text.trim()}
        title={!text.trim() ? "Write what needs to change" : ""}
        onClick={() => run(() => reviewSubmission(sub.id, { action: "REQUEST_CHANGES", reviewNotes: text })).then(() => setText(""))}
      >
        Request changes
      </button>
    );
  }
  if (sub.status === "APPROVED") {
    actions.push(
      <button key="share" className={btnPrimary} onClick={() => run(() => updateShareStatus(sub.id, { sharedWithStudent: true }))}>
        Mark shared with student
      </button>
    );
  }
  if (sub.status === "SHARED_WITH_STUDENT") {
    actions.push(
      <button key="fb" className={btnPrimary} disabled={!text.trim()} onClick={() => run(() => recordStudentFeedback(sub.id, { studentFeedback: text })).then(() => setText(""))}>
        Save student feedback
      </button>
    );
  }
  if (sub.status === "FEEDBACK_RECEIVED") {
    actions.push(
      <button key="done" className={btnPrimary} onClick={() => run(() => updateSubmissionStatus(sub.id, { status: "COMPLETED" }))}>
        Complete stage
      </button>
    );
  }
  const needsText = ["SUBMITTED", "IN_REVIEW", "SHARED_WITH_STUDENT"].includes(sub.status);

  return (
    <div className={cn("rounded-xl border", sub.overdue ? "border-rose-200" : "border-slate-200")}>
      <button onClick={() => setOpen(!open)} className="w-full flex flex-wrap items-center gap-3 p-4 text-left" aria-expanded={open}>
        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{t.order}</span>
        <span className="font-bold text-slate-900 flex-1 min-w-[10rem]">{t.name}</span>
        {sub.overdue && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
            <AlertTriangle size={12} /> Overdue
          </span>
        )}
        <span className="text-xs font-semibold text-slate-500">Due {fmtDate(sub.deadline)}</span>
        <StatusBadge status={sub.status} />
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          {(t.instructions || t.templateFileUrl) && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 space-y-1">
              {t.instructions && <p className="whitespace-pre-wrap">{t.instructions}</p>}
              {t.templateFileUrl && (
                <a href={t.templateFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline break-all">
                  <ExternalLink size={12} /> Template
                </a>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Links</span>
              {sub.missingLinkTypes?.map((m: string) => (
                <span key={m} className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                  Missing {LINK_LABELS[m]}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {sub.links.map((l: any) => (
                <LinkChip key={l.id} link={l} onDelete={() => run(() => deleteLink(l.id))} />
              ))}
              {!sub.links.length && <span className="text-sm text-slate-400">No links yet.</span>}
            </div>
            <AddLinkForm compact onAdd={(link: LinkInput) => run(() => addSubmissionLink(sub.id, link))} />
          </div>

          {sub.studentFeedback && (
            <div className="text-sm bg-violet-50 text-violet-900 rounded-lg p-3">
              <span className="font-bold">Student feedback:</span> {sub.studentFeedback}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            {needsText && (
              <textarea
                rows={2}
                className={cn(inputCls, "flex-1 min-w-[14rem]")}
                placeholder={sub.status === "SHARED_WITH_STUDENT" ? "What did the student say?" : "Review notes (required to request changes)"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
            {actions}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <label className="flex items-center gap-1.5">
              Status
              <select
                className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-semibold"
                value={sub.status}
                onChange={(e) => run(() => updateSubmissionStatus(sub.id, { status: e.target.value }))}
              >
                {SUBMISSION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              Deadline
              <input
                type="date"
                className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-xs"
                defaultValue={toInputDate(sub.deadline)}
                onBlur={(e) => e.target.value && e.target.value !== toInputDate(sub.deadline) && run(() => setSubmissionDeadline(sub.id, e.target.value))}
              />
            </label>
            {sub.submittedByAdmin && <span>Submitted by {sub.submittedByAdmin.name} · {fmtDate(sub.submittedAt)}</span>}
            {sub.reviewedByAdmin && <span>Reviewed by {sub.reviewedByAdmin.name} · {fmtDate(sub.reviewedAt)}</span>}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notes</span>
            {sub.notes.map((n: any) => (
              <div key={n.id} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-slate-500">
                  {n.admin?.name} · {fmtDateTime(n.createdAt)}
                </span>
                <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (note.trim()) run(() => addSubmissionNote(sub.id, { content: note.trim() })).then(() => setNote(""));
              }}
            >
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to this stage" aria-label="Stage note" />
              <button className={btnSecondary} disabled={!note.trim()}>
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Delivery form                                                               */
/* -------------------------------------------------------------------------- */
function DeliveryForm({ studentId, stages, run, onDone }: { studentId: string; stages: any[]; run: Run; onDone: () => void }) {
  const [f, setF] = useState({ title: "", description: "", channel: "WhatsApp", submissionId: "", mode: "SENT", scheduledFor: "", url: "" });
  const [links, setLinks] = useState<LinkInput[]>([]);
  return (
    <form
      className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200"
      onSubmit={async (e) => {
        e.preventDefault();
        const all = f.url.trim() ? [...links, { url: f.url.trim() }] : links;
        await run(() =>
          createDelivery({
            studentId,
            title: f.title,
            description: f.description || null,
            channel: f.channel || null,
            submissionId: f.submissionId || null,
            status: f.mode,
            scheduledFor: f.mode === "PLANNED" ? f.scheduledFor || null : null,
            links: all,
          })
        );
        onDone();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="md:col-span-2 text-xs font-bold text-slate-500">
          What are you sending? *
          <input required className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Week 3 results + updated notebook" />
        </label>
        <label className="md:col-span-2 text-xs font-bold text-slate-500">
          Details
          <textarea rows={2} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
        <label className="text-xs font-bold text-slate-500">
          Sent / to send
          <select className={inputCls} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option value="SENT">Sent now</option>
            <option value="PLANNED">Plan for later</option>
          </select>
        </label>
        {f.mode === "PLANNED" ? (
          <label className="text-xs font-bold text-slate-500">
            Send on
            <input type="date" className={inputCls} value={f.scheduledFor} onChange={(e) => setF({ ...f, scheduledFor: e.target.value })} />
          </label>
        ) : (
          <label className="text-xs font-bold text-slate-500">
            Channel
            <input className={inputCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} placeholder="WhatsApp, Email, Drive..." />
          </label>
        )}
        <label className="md:col-span-2 text-xs font-bold text-slate-500">
          Related stage
          <select className={inputCls} value={f.submissionId} onChange={(e) => setF({ ...f, submissionId: e.target.value })}>
            <option value="">—</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.submissionTemplate.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500">Links</span>
        <div className="flex flex-wrap gap-2">
          {links.map((l, i) => (
            <LinkChip key={i} link={{ type: l.type || "OTHER", url: l.url, label: l.label }} onDelete={() => setLinks(links.filter((_, j) => j !== i))} />
          ))}
        </div>
        <AddLinkForm compact onAdd={async (l) => setLinks([...links, l])} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary} disabled={!f.title.trim()}>
          <Send size={16} /> {f.mode === "PLANNED" ? "Plan delivery" : "Log delivery"}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */
export default function StudentWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { formatPrice } = useCurrencyStore();
  const [w, setW] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [showDelivery, setShowDelivery] = useState(false);
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<any>({});

  const load = useCallback(async () => {
    try {
      setW(await getStudentWorkspace(id));
    } catch (e) {
      setError(errorMessage(e, "Failed to load student"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run: Run = async (fn) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!w) {
    return (
      <div className="p-12 text-center space-y-3">
        <ErrorBanner message={error || "Student not found"} />
        <Link href="/students" className="text-primary text-sm font-bold hover:underline">
          ← Back to students
        </Link>
      </div>
    );
  }

  const s = w.summary;
  const project = w.mscProject;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/students" className="p-2 hover:bg-slate-100 rounded-xl mt-1" aria-label="Back to students">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/subjects/${project.id}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-primary">
            {project.name}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{w.name}</h1>
          {w.projectTitle && <p className="text-slate-600 mt-1">{w.projectTitle}</p>}
          {w.person?.enrollments?.length > 1 && (
            <p className="text-xs text-slate-500 mt-1">
              Also enrolled in:{" "}
              {w.person.enrollments
                .filter((e: any) => e.id !== w.id)
                .map((e: any, i: number) => (
                  <React.Fragment key={e.id}>
                    {i > 0 && ", "}
                    <Link href={`/students/${e.id}`} className="font-semibold text-primary hover:underline">
                      {e.mscProject.name}
                    </Link>
                  </React.Fragment>
                ))}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            <span>{w.rollNo}</span>
            <span className="inline-flex items-center gap-1">
              <Phone size={12} /> {w.mobileNo}
            </span>
            {w.email && (
              <span className="inline-flex items-center gap-1">
                <Mail size={12} /> {w.email}
              </span>
            )}
            {w.meetingDay && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> Meets {w.meetingDay}
              </span>
            )}
          </div>
        </div>
        <button
          className={btnSecondary}
          onClick={() => {
            setDetails({
              name: w.name,
              mobileNo: w.mobileNo,
              rollNo: w.rollNo,
              email: w.email || "",
              projectTitle: w.projectTitle || "",
              agreedAmount: Number(w.agreedAmount),
              meetingDay: w.meetingDay || "",
            });
            setEditing(!editing);
          }}
        >
          Edit details
        </button>
        <select
          aria-label="Student status"
          className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold"
          value={w.status}
          onChange={(e) => run(() => updateStudent(w.id, { status: e.target.value }))}
        >
          {["ACTIVE", "ON_HOLD", "COMPLETED", "DROPPED"].map((x) => (
            <option key={x} value={x}>
              {humanize(x)}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} onClose={() => setError("")} />

      {editing && (
        <form
          className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await run(() => updateStudent(w.id, { ...details, agreedAmount: Number(details.agreedAmount) }));
            setEditing(false);
          }}
        >
          {[
            ["name", "Name"],
            ["mobileNo", "Mobile"],
            ["rollNo", "Roll no"],
            ["email", "Email"],
            ["projectTitle", "Project title (optional)"],
            ["meetingDay", "Meeting day"],
          ].map(([k, label]) => (
            <label key={k} className="text-xs font-bold text-slate-500">
              {label}
              <input className={inputCls} value={details[k] ?? ""} onChange={(e) => setDetails({ ...details, [k]: e.target.value })} />
            </label>
          ))}
          <label className="text-xs font-bold text-slate-500">
            Agreed amount (£)
            <input type="number" className={inputCls} value={details.agreedAmount} onChange={(e) => setDetails({ ...details, agreedAmount: e.target.value })} />
          </label>
          <p className="md:col-span-2 text-xs text-slate-500 self-end">Name, mobile, roll no and email are updated on all of this student&apos;s projects.</p>
          <div className="md:col-span-3 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className={btnPrimary}>Save</button>
          </div>
        </form>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { k: "Current stage", v: s.currentStage, sub: `${s.stagesCompleted}/${s.stagesTotal} stages done` },
          { k: "Sprint tasks", v: `${s.tasksDone}/${s.tasksTotal}`, sub: "done" },
          { k: "Deliveries", v: `${s.deliveriesSent} sent`, sub: `${s.deliveriesPlanned} planned` },
          { k: "Outstanding", v: formatPrice(s.outstandingBalance), sub: `${formatPrice(s.totalPaid)} of ${formatPrice(s.agreedAmount)} paid` },
        ].map((c) => (
          <div key={c.k} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{c.k}</p>
            <p className="text-lg font-bold text-slate-900 mt-1 truncate" title={String(c.v)}>
              {c.v}
            </p>
            <p className="text-xs text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Stages */}
          <Card title="Sprint stages & submissions">
            <div className="space-y-3">
              {w.submissions.map((sub: any) => (
                <StageCard key={sub.id} sub={sub} run={run} />
              ))}
            </div>
          </Card>

          {/* Deliveries */}
          <Card
            title="Sent to student"
            action={
              !showDelivery && (
                <button className={btnPrimary} onClick={() => setShowDelivery(true)}>
                  <Plus size={16} /> Log / plan delivery
                </button>
              )
            }
          >
            {showDelivery && (
              <div className="mb-4">
                <DeliveryForm studentId={w.id} stages={w.submissions} run={run} onDone={() => setShowDelivery(false)} />
              </div>
            )}
            <div className="space-y-3">
              {w.deliveries.map((d: any) => {
                const overdue = d.status === "PLANNED" && d.scheduledFor && new Date(d.scheduledFor) < new Date();
                return (
                  <div key={d.id} className={cn("p-4 rounded-xl border", overdue ? "border-rose-200 bg-rose-50/40" : "border-slate-200")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 flex-1 min-w-[10rem]">{d.title}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {d.status === "PLANNED"
                        ? `Planned for ${fmtDate(d.scheduledFor)}${overdue ? " · overdue" : ""}`
                        : `Sent ${fmtDateTime(d.sentAt)}${d.channel ? ` via ${d.channel}` : ""}${d.sentByAdmin ? ` by ${d.sentByAdmin.name}` : ""}`}
                      {d.submission && ` · ${d.submission.submissionTemplate.name}`}
                    </p>
                    {d.description && <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{d.description}</p>}
                    {d.links.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {d.links.map((l: any) => (
                          <LinkChip key={l.id} link={l} />
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {d.status === "PLANNED" && (
                        <button className={btnSecondary} onClick={() => run(() => updateDelivery(d.id, { status: "SENT" }))}>
                          <Send size={14} /> Mark sent
                        </button>
                      )}
                      {d.status === "SENT" && (
                        <button className={btnSecondary} onClick={() => run(() => updateDelivery(d.id, { status: "ACKNOWLEDGED" }))}>
                          <CheckCircle2 size={14} /> Student acknowledged
                        </button>
                      )}
                      <button
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        aria-label="Delete delivery"
                        onClick={() => window.confirm(`Delete "${d.title}"?`) && run(() => deleteDelivery(d.id))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {!w.deliveries.length && !showDelivery && <p className="text-sm text-slate-400">Nothing sent yet.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Links */}
          <Card title="Project links">
            {project.briefDocUrl && (
              <a href={project.briefDocUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-primary hover:underline mb-3">
                <ExternalLink size={14} /> Shared brief document
              </a>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              {w.links.map((l: any) => (
                <LinkChip key={l.id} link={l} onDelete={() => run(() => deleteLink(l.id))} />
              ))}
              {!w.links.length && <span className="text-sm text-slate-400">GitHub repo, Colab, dataset, Drive folder…</span>}
            </div>
            <AddLinkForm compact onAdd={(l) => run(() => addStudentLink(w.id, l))} />
          </Card>

          {/* Tasks */}
          <Card title={`Sprint tasks (${s.tasksDone}/${s.tasksTotal})`}>
            {s.tasksTotal > 0 && (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-500" style={{ width: `${(s.tasksDone / s.tasksTotal) * 100}%` }} />
              </div>
            )}
            <ul className="space-y-1 mb-3">
              {w.tasks.map((t: any) => {
                const Icon = TASK_ICON[t.status] || Circle;
                return (
                  <li key={t.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <button
                      onClick={() => run(() => updateTask(t.id, { status: TASK_NEXT[t.status] }))}
                      aria-label={`${t.title}: ${humanize(t.status)}. Click to advance`}
                      title={`${humanize(t.status)} → ${humanize(TASK_NEXT[t.status])}`}
                      className={cn(
                        t.status === "DONE" ? "text-emerald-500" : t.status === "IN_PROGRESS" ? "text-blue-500" : t.status === "BLOCKED" ? "text-rose-500" : "text-slate-300"
                      )}
                    >
                      <Icon size={18} />
                    </button>
                    <span className={cn("flex-1 text-sm", t.status === "DONE" && "line-through text-slate-400")}>{t.title}</span>
                    <button
                      onClick={() => run(() => updateTask(t.id, { status: t.status === "BLOCKED" ? "TODO" : "BLOCKED" }))}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                    >
                      {t.status === "BLOCKED" ? "Unblock" : "Block"}
                    </button>
                    <button
                      onClick={() => run(() => deleteTask(t.id))}
                      aria-label={`Delete ${t.title}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
              {!w.tasks.length && <li className="text-sm text-slate-400">No tasks yet.</li>}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (taskTitle.trim()) run(() => createTask({ studentId: w.id, title: taskTitle.trim() })).then(() => setTaskTitle(""));
              }}
            >
              <input className={inputCls} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="New task" aria-label="New task" />
              <button className={btnSecondary} disabled={!taskTitle.trim()}>
                <Plus size={16} />
              </button>
            </form>
          </Card>

          {/* Notes */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <MessageSquareText size={16} className="text-primary" /> Meeting notes
              </span>
            }
          >
            <form
              className="space-y-2 mb-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (studentNote.trim()) run(() => addStudentNote(w.id, studentNote.trim())).then(() => setStudentNote(""));
              }}
            >
              <textarea rows={3} className={inputCls} value={studentNote} onChange={(e) => setStudentNote(e.target.value)} placeholder="What was discussed / decided?" aria-label="Meeting note" />
              <button className={cn(btnSecondary, "w-full")} disabled={!studentNote.trim()}>
                Add note
              </button>
            </form>
            <div className="space-y-2">
              {w.notes.map((n: any) => (
                <div key={n.id} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-slate-500">
                    {n.admin?.name} · {fmtDateTime(n.createdAt)}
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
