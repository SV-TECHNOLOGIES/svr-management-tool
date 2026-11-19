"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
  ListChecks,
  Layers,
  BookText,
  Users,
  Save,
  X,
} from "lucide-react";
import {
  getMscProjectById,
  updateMscProject,
  addStageTemplate,
  updateStageTemplate,
  deleteStageTemplate,
  addTaskTemplate,
  deleteTaskTemplate,
  errorMessage,
  LINK_TYPES,
} from "@/lib/api";
import {
  Card,
  ErrorBanner,
  StatusBadge,
  LINK_LABELS,
  inputCls,
  btnPrimary,
  btnSecondary,
} from "@/components/workspace/ui";
import { cn } from "@/lib/utils";
import { StudentsPanel } from "@/components/project/students-panel";
import { DeliverablesPanel } from "@/components/project/deliverables-panel";
import { ExpensesPanel } from "@/components/project/expenses-panel";
import { FinancePanel } from "@/components/project/finance-panel";

const TABS = [
  { id: "setup", label: "Setup" },
  { id: "students", label: "Students" },
  { id: "deliverables", label: "Deliverables" },
  { id: "expenses", label: "Expenses" },
  { id: "money", label: "Money & split" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Stage = {
  id: string;
  name: string;
  order: number;
  isFinal: boolean;
  templateFileUrl: string | null;
  deadlineOffsetDays: number | null;
  paymentPercentage: string | number;
  instructions: string | null;
  requiredLinkTypes: string[];
};

const emptyStage = {
  name: "",
  deadlineOffsetDays: 14,
  paymentPercentage: 0,
  templateFileUrl: "",
  instructions: "",
  requiredLinkTypes: [] as string[],
  isFinal: false,
};

function LinkTypePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LINK_TYPES.map((t) => {
        const on = value.includes(t);
        return (
          <button
            type="button"
            key={t}
            onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors",
              on ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            {LINK_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}

function StageForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: typeof emptyStage;
  onSave: (v: typeof emptyStage) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(f);
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="md:col-span-3 text-xs font-bold text-slate-500">
          Stage name *
          <input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Midpoint review PPT" />
        </label>
        <label className="text-xs font-bold text-slate-500">
          Deadline (days after start)
          <input type="number" className={inputCls} value={f.deadlineOffsetDays} onChange={(e) => setF({ ...f, deadlineOffsetDays: Number(e.target.value) })} />
        </label>
        <label className="text-xs font-bold text-slate-500">
          Payment due at this stage (%)
          <input type="number" className={inputCls} value={f.paymentPercentage} onChange={(e) => setF({ ...f, paymentPercentage: Number(e.target.value) })} />
        </label>
        <label className="text-xs font-bold text-slate-500 flex items-end gap-2 pb-3">
          <input type="checkbox" checked={f.isFinal} onChange={(e) => setF({ ...f, isFinal: e.target.checked })} />
          Final stage (completes the student)
        </label>
        <label className="md:col-span-3 text-xs font-bold text-slate-500">
          Template / submission document link
          <input className={inputCls} value={f.templateFileUrl} onChange={(e) => setF({ ...f, templateFileUrl: e.target.value })} placeholder="https://docs.google.com/..." />
        </label>
        <label className="md:col-span-3 text-xs font-bold text-slate-500">
          What needs to be submitted (instructions)
          <textarea rows={3} className={inputCls} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
        </label>
        <div className="md:col-span-3 text-xs font-bold text-slate-500 space-y-1.5">
          <span>Required links for this stage</span>
          <LinkTypePicker value={f.requiredLinkTypes} onChange={(v) => setF({ ...f, requiredLinkTypes: v })} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Cancel
        </button>
        <button type="submit" disabled={busy || !f.name} className={btnPrimary}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save stage
        </button>
      </div>
    </form>
  );
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingBrief, setEditingBrief] = useState(false);
  const [brief, setBrief] = useState({ briefing: "", briefDocUrl: "", description: "" });
  const [editingStage, setEditingStage] = useState<string | null>(null); // stage id or "new"
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStage, setTaskStage] = useState("");
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [rebalance, setRebalance] = useState(true);
  const [tab, setTab] = useState<Tab>("setup");
  const [moneyKey, setMoneyKey] = useState(0);
  const showError = useCallback((m: string) => setError(m), []);

  const load = useCallback(async () => {
    try {
      const p = await getMscProjectById(id);
      setProject(p);
      setBrief({ briefing: p.briefing || "", briefDocUrl: p.briefDocUrl || "", description: p.description || "" });
    } catch (e) {
      setError(errorMessage(e, "Failed to load project"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="p-12 text-center space-y-3">
        <ErrorBanner message={error || "Project not found"} />
        <Link href="/subjects" className="text-primary text-sm font-bold hover:underline">
          ← Back to projects
        </Link>
      </div>
    );
  }

  const stages: Stage[] = project.submissionTemplates || [];
  const totalPct = stages.reduce((a, s) => a + Number(s.paymentPercentage || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start gap-3">
        <Link href="/subjects" className="p-2 hover:bg-slate-100 rounded-xl mt-1" aria-label="Back to projects">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 break-words">{project.name}</h1>
          {project.description && <p className="text-slate-500 mt-1">{project.description}</p>}
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError("")} />

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
            {t.id === "students" && ` (${project.students?.length || 0})`}
          </button>
        ))}
      </div>

      {tab === "students" && <StudentsPanel project={project} onChange={() => { load(); setMoneyKey((k) => k + 1); }} onError={showError} />}
      {tab === "deliverables" && <DeliverablesPanel projectId={id} onError={showError} />}
      {tab === "expenses" && (
        <ExpensesPanel
          projectId={id}
          students={(project.students || []).map((s: any) => ({ id: s.id, name: s.name }))}
          onChange={() => setMoneyKey((k) => k + 1)}
          onError={showError}
        />
      )}
      {tab === "money" && <FinancePanel projectId={id} refreshKey={moneyKey} onError={showError} />}

      {tab === "setup" && (
      <>
      {/* Brief */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <BookText size={18} className="text-primary" /> Briefing / task document
          </span>
        }
        action={
          !editingBrief && (
            <button onClick={() => setEditingBrief(true)} className={btnSecondary}>
              <Pencil size={14} /> Edit
            </button>
          )
        }
      >
        {editingBrief ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await run(() => updateMscProject(id, brief));
              setEditingBrief(false);
            }}
          >
            <label className="block text-xs font-bold text-slate-500">
              Short description
              <input className={inputCls} value={brief.description} onChange={(e) => setBrief({ ...brief, description: e.target.value })} />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              Brief document link (shared by every student build)
              <input className={inputCls} value={brief.briefDocUrl} onChange={(e) => setBrief({ ...brief, briefDocUrl: e.target.value })} placeholder="https://docs.google.com/document/..." />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              Briefing / task description
              <textarea rows={8} className={inputCls} value={brief.briefing} onChange={(e) => setBrief({ ...brief, briefing: e.target.value })} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setEditingBrief(false)}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                <Save size={16} /> Save brief
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {project.briefDocUrl ? (
              <a href={project.briefDocUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline break-all">
                <ExternalLink size={14} /> {project.briefDocUrl}
              </a>
            ) : (
              <p className="text-sm text-slate-400">No brief document linked yet.</p>
            )}
            {project.briefing ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.briefing}</p>
            ) : (
              <p className="text-sm text-slate-400">Add the shared brief every student build follows.</p>
            )}
          </div>
        )}
      </Card>

      {/* Stages */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Layers size={18} className="text-primary" /> Submission stages
            <span className={cn("text-xs font-semibold", totalPct === 100 ? "text-emerald-600" : "text-amber-600")}>
              · payments total {totalPct}%
            </span>
          </span>
        }
        action={
          editingStage !== "new" && (
            <button onClick={() => setEditingStage("new")} className={btnPrimary}>
              <Plus size={16} /> Add stage
            </button>
          )
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-xs text-slate-500">
            Every student gets each stage. Adding a stage here also adds it, as Pending, for students already enrolled.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <input type="checkbox" checked={rebalance} onChange={(e) => setRebalance(e.target.checked)} />
              Split payment % evenly when adding a stage
            </label>
            {totalPct !== 100 && stages.length > 0 && (
              <button
                className="text-xs font-bold text-primary hover:underline"
                onClick={() => {
                  const base = Math.floor(100 / stages.length);
                  run(() =>
                    Promise.all(
                      stages.map((st, i) =>
                        updateStageTemplate(st.id, { paymentPercentage: i === stages.length - 1 ? 100 - base * (stages.length - 1) : base })
                      )
                    )
                  ).catch(() => {});
                }}
              >
                Split evenly now
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {stages.map((s) =>
            editingStage === s.id ? (
              <StageForm
                key={s.id}
                initial={{
                  name: s.name,
                  deadlineOffsetDays: s.deadlineOffsetDays ?? 14,
                  paymentPercentage: Number(s.paymentPercentage),
                  templateFileUrl: s.templateFileUrl || "",
                  instructions: s.instructions || "",
                  requiredLinkTypes: s.requiredLinkTypes || [],
                  isFinal: s.isFinal,
                }}
                onCancel={() => setEditingStage(null)}
                onSave={async (v) => {
                  await run(() => updateStageTemplate(s.id, v));
                  setEditingStage(null);
                }}
              />
            ) : (
              <div key={s.id} className="flex flex-col md:flex-row md:items-start gap-3 p-4 rounded-xl border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">{s.order}</div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{s.name}</span>
                    {s.isFinal && <StatusBadge status="FINAL" className="bg-navy text-white" />}
                  </div>
                  <p className="text-xs text-slate-500">
                    Due {s.deadlineOffsetDays ?? 14} days after start · {Number(s.paymentPercentage)}% payment
                  </p>
                  {s.instructions && <p className="text-sm text-slate-700 whitespace-pre-wrap">{s.instructions}</p>}
                  {s.templateFileUrl && (
                    <a href={s.templateFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline break-all">
                      <ExternalLink size={12} /> Template: {s.templateFileUrl}
                    </a>
                  )}
                  {s.requiredLinkTypes?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-xs text-slate-500">Requires:</span>
                      {s.requiredLinkTypes.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                          {LINK_LABELS[t]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditingStage(s.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label={`Edit ${s.name}`}>
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete stage "${s.name}"? Only possible if no student has work on it.`)) {
                        run(() => deleteStageTemplate(s.id)).catch(() => {});
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          )}
          {editingStage === "new" && (
            <StageForm
              initial={emptyStage}
              onCancel={() => setEditingStage(null)}
              onSave={async (v) => {
                await run(async () => {
                  await addStageTemplate(id, v);
                  if (rebalance) {
                    const fresh = await getMscProjectById(id);
                    const all: Stage[] = fresh.submissionTemplates;
                    const base = Math.floor(100 / all.length);
                    await Promise.all(
                      all.map((st, i) =>
                        updateStageTemplate(st.id, {
                          paymentPercentage: i === all.length - 1 ? 100 - base * (all.length - 1) : base,
                          isFinal: i === all.length - 1,
                        })
                      )
                    );
                  }
                });
                setEditingStage(null);
              }}
            />
          )}
          {stages.length === 0 && editingStage !== "new" && <p className="text-sm text-slate-400">No stages yet.</p>}
        </div>
      </Card>

      {/* Checklist */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <ListChecks size={18} className="text-primary" /> Default sprint checklist
          </span>
        }
      >
        <p className="text-xs text-slate-500 mb-4">Copied into every new student build as their task list.</p>
        <ul className="space-y-2 mb-4">
          {(project.taskTemplates || []).map((t: any) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
              <span className="text-xs font-bold text-slate-400 w-5">{t.order}</span>
              <span className="flex-1 text-sm text-slate-800">{t.title}</span>
              {t.submissionTemplateId && (
                <span className="text-xs text-slate-500">{stages.find((s) => s.id === t.submissionTemplateId)?.name}</span>
              )}
              <button
                onClick={() => run(() => deleteTaskTemplate(t.id)).catch(() => {})}
                className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                aria-label={`Delete ${t.title}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {!project.taskTemplates?.length && <li className="text-sm text-slate-400">No checklist items yet.</li>}
        </ul>
        <form
          className="flex flex-wrap gap-2 items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!taskTitle.trim()) return;
            await run(() => addTaskTemplate(id, { title: taskTitle.trim(), submissionTemplateId: taskStage || null, applyToExisting })).catch(() => {});
            setTaskTitle("");
          }}
        >
          <input className={cn(inputCls, "flex-1 min-w-[12rem] w-auto")} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Train baseline model" aria-label="Checklist item" />
          <select className={cn(inputCls, "w-auto")} value={taskStage} onChange={(e) => setTaskStage(e.target.value)} aria-label="Stage">
            <option value="">Any stage</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <input type="checkbox" checked={applyToExisting} onChange={(e) => setApplyToExisting(e.target.checked)} />
            Also add to current students
          </label>
          <button type="submit" className={btnPrimary} disabled={!taskTitle.trim()}>
            <Plus size={16} /> Add
          </button>
        </form>
      </Card>

      </>
      )}
    </div>
  );
}
