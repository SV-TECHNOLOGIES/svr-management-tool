"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Search, UserPlus, Users, Check } from "lucide-react";
import { createStudent, enrollMany, getPeople, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { inputCls, btnPrimary, btnSecondary } from "./ui";

type Project = {
  id: string;
  name: string;
  amountRangeLow?: number | string;
  amountRangeHigh?: number | string;
  lastAgreedAmount?: number | null;
  students?: { agreedAmount: number | string; createdAt: string }[];
};

/** Price of the most recently enrolled student in the project (default for the next one). */
const lastAmount = (p?: Project) => {
  if (!p) return null;
  if (p.lastAgreedAmount !== undefined && p.lastAgreedAmount !== null) return Number(p.lastAgreedAmount);
  const latest = [...(p.students || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return latest ? Number(latest.agreedAmount) : null;
};
type Person = {
  id: string;
  name: string;
  mobileNo: string;
  rollNo: string | null;
  enrollments: { projectId: string; projectName: string }[];
};

/**
 * Enroll a student into a project: tag an existing student (any project) or add a new one.
 * When `projectId` is given the project picker is hidden (used on the project page).
 */
export function EnrollModal({
  projects,
  projectId,
  onClose,
  onDone,
}: {
  projects: Project[];
  projectId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [result, setResult] = useState<{ created: { name: string }[]; skipped: { personId: string; reason: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({
    mscProjectId: projectId || projects[0]?.id || "",
    name: "",
    mobileNo: "",
    rollNo: "",
    email: "",
    projectTitle: "",
    agreedAmount: "",
    advancePaid: "",
  });
  const [amountTouched, setAmountTouched] = useState(false);

  useEffect(() => {
    getPeople()
      .then((p: Person[]) => {
        setPeople(p);
        if (!p.length) setMode("new");
      })
      .catch(() => setMode("new"));
  }, []);

  const project = projects.find((p) => p.id === f.mscProjectId);
  const suggested = lastAmount(project);

  // Pre-fill the agreed amount from the last student enrolled in this project (until the user types one)
  useEffect(() => {
    if (!amountTouched) setF((prev) => ({ ...prev, agreedAmount: suggested !== null ? String(suggested) : "" }));
  }, [suggested, amountTouched]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.rollNo || "").toLowerCase().includes(q) || p.mobileNo.includes(q)
    );
  }, [people, search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.mscProjectId) return setError("Choose a project");
    if (mode === "existing" && !personIds.length) return setError("Pick one or more students, or switch to New student");
    if (mode === "new" && (!f.name.trim() || !f.mobileNo.trim())) return setError("Name and mobile number are required");
    if (f.agreedAmount === "" || isNaN(Number(f.agreedAmount))) return setError("Agreed amount is required");
    setBusy(true);
    try {
      if (mode === "existing") {
        const r = await enrollMany(f.mscProjectId, {
          personIds,
          agreedAmount: Number(f.agreedAmount),
          projectTitle: f.projectTitle.trim() || undefined,
          advancePaid: f.advancePaid ? Number(f.advancePaid) : undefined,
        });
        if (r.skipped.length) {
          setResult(r); // show what failed; keep the modal open
          setPersonIds(r.skipped.map((x: { personId: string }) => x.personId));
          return;
        }
      } else {
        await createStudent({
          mscProjectId: f.mscProjectId,
          name: f.name.trim(),
          mobileNo: f.mobileNo.trim(),
          rollNo: f.rollNo.trim() || undefined,
          email: f.email.trim() || undefined,
          projectTitle: f.projectTitle.trim() || undefined,
          agreedAmount: Number(f.agreedAmount),
          advancePaid: f.advancePaid ? Number(f.advancePaid) : undefined,
        });
      }
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Failed to enroll student"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Enroll student">
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Enroll student{project && projectId ? ` in ${project.name}` : ""}</h3>
            <p className="text-xs text-slate-500">Creates their submission stages, sprint tasks and planned deliverables.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!projectId && (
          <label className="block text-xs font-bold text-slate-500">
            Project *
            <select className={inputCls} value={f.mscProjectId} onChange={(e) => setF({ ...f, mscProjectId: e.target.value })}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.amountRangeLow !== undefined ? ` (£${p.amountRangeLow}–£${p.amountRangeHigh})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl" role="tablist">
          {(
            [
              ["existing", "Existing student", Users],
              ["new", "New student", UserPlus],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold",
                mode === id ? "bg-white shadow-sm text-primary" : "text-slate-500"
              )}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={cn(inputCls, "pl-9")} placeholder="Search name, roll no or mobile" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">{personIds.length} selected</span>
              <span className="flex gap-3">
                <button
                  type="button"
                  className="font-bold text-primary hover:underline"
                  onClick={() =>
                    setPersonIds(
                      Array.from(new Set([...personIds, ...filtered.filter((p) => !p.enrollments.some((e) => e.projectId === f.mscProjectId)).map((p) => p.id)]))
                    )
                  }
                >
                  Select all shown
                </button>
                {personIds.length > 0 && (
                  <button type="button" className="font-semibold text-slate-500 hover:underline" onClick={() => setPersonIds([])}>
                    Clear
                  </button>
                )}
              </span>
            </div>
            <ul className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filtered.map((p) => {
                const already = p.enrollments.some((e) => e.projectId === f.mscProjectId);
                const selected = personIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => setPersonIds(selected ? personIds.filter((x) => x !== p.id) : [...personIds, p.id])}
                      aria-pressed={selected}
                      className={cn(
                        "w-full text-left px-3 py-2.5 flex items-center gap-3",
                        selected ? "bg-primary/5" : "hover:bg-slate-50",
                        already && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0", selected ? "bg-primary border-primary text-white" : "border-slate-300")}>
                        {selected && <Check size={12} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {[p.rollNo, p.mobileNo].filter(Boolean).join(" · ")}
                          {p.enrollments.length > 0 && ` · in ${p.enrollments.map((e) => e.projectName).join(", ")}`}
                        </span>
                      </span>
                      {already && <span className="text-[11px] font-bold text-slate-500">Already enrolled</span>}
                    </button>
                  </li>
                );
              })}
              {!filtered.length && <li className="px-3 py-4 text-sm text-slate-400">No students match.</li>}
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs font-bold text-slate-500">
              Name *
              <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Mobile *
              <input className={inputCls} value={f.mobileNo} onChange={(e) => setF({ ...f, mobileNo: e.target.value })} placeholder="+44 7911 123456" />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Roll no
              <input className={inputCls} value={f.rollNo} onChange={(e) => setF({ ...f, rollNo: e.target.value })} />
            </label>
            <label className="col-span-2 text-xs font-bold text-slate-500">
              Email
              <input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <label className="col-span-2 text-xs font-bold text-slate-500 pt-3">
            Project title / topic <span className="font-medium text-slate-400">(optional)</span>
            <input className={inputCls} value={f.projectTitle} onChange={(e) => setF({ ...f, projectTitle: e.target.value })} placeholder="e.g. Smart waste classification" />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Agreed amount (£) *{mode === "existing" && personIds.length > 1 ? " each" : ""}
            <input type="number" min={0} className={inputCls} value={f.agreedAmount} onChange={(e) => { setAmountTouched(true); setF({ ...f, agreedAmount: e.target.value }); }} placeholder={project?.amountRangeLow !== undefined ? `£${project.amountRangeLow}–£${project.amountRangeHigh}` : ""} />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Advance paid (£)
            <input type="number" min={0} className={inputCls} value={f.advancePaid} onChange={(e) => setF({ ...f, advancePaid: e.target.value })} />
          </label>
        </div>

        {suggested !== null && !amountTouched && (
          <p className="text-xs text-slate-500 -mt-2">Pre-filled from the last student enrolled in this project (£{suggested}).</p>
        )}

        {result && (
          <div role="status" className="text-sm rounded-xl px-3 py-2 bg-amber-50 border border-amber-100 text-amber-800">
            {result.created.length > 0 && <p>Enrolled: {result.created.map((c) => c.name).join(", ")}.</p>}
            <p className="font-semibold">Not enrolled:</p>
            <ul className="list-disc pl-5">
              {result.skipped.map((x) => (
                <li key={x.personId}>
                  {people.find((p) => p.id === x.personId)?.name || x.personId}: {x.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "existing" && personIds.length > 1 ? `Enroll ${personIds.length} students` : "Enroll"}
          </button>
        </div>
      </form>
    </div>
  );
}
