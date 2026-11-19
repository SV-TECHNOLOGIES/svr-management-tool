"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, CheckCircle2, Undo2 } from "lucide-react";
import {
  getOutsourcingExpenses,
  createOutsourcingExpense,
  updateOutsourcingExpense,
  deleteOutsourcingExpense,
  errorMessage,
} from "@/lib/api";
import { Card, StatusBadge, fmtDate, inputCls, btnPrimary, btnSecondary } from "@/components/workspace/ui";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { cn } from "@/lib/utils";

/** Outsourcing expenses for one project (or all projects when projectId is omitted). */
export function ExpensesPanel({
  projectId,
  projects,
  students,
  onChange,
  onError,
  title = "Expenses & outsourcing",
}: {
  projectId?: string;
  projects?: { id: string; name: string }[];
  students?: { id: string; name: string; mscProjectId?: string }[];
  onChange?: () => void;
  onError: (m: string) => void;
  title?: string;
}) {
  const { formatPrice } = useCurrencyStore();
  const [data, setData] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"" | "UNPAID" | "PAID">("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ mscProjectId: projectId || projects?.[0]?.id || "", studentId: "", paidTo: "", description: "", amount: "", status: "UNPAID" as "UNPAID" | "PAID", notes: "" });

  const load = useCallback(async () => {
    try {
      setData(await getOutsourcingExpenses(projectId ? { mscProjectId: projectId } : undefined));
    } catch (e) {
      onError(errorMessage(e, "Failed to load expenses"));
    }
  }, [projectId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!f.mscProjectId && projects?.[0]) setF((p) => ({ ...p, mscProjectId: projects[0].id }));
  }, [projects, f.mscProjectId]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      onError(errorMessage(e));
    }
    await load();
    onChange?.();
  };

  const vendorStudents = (students || []).filter((s) => !s.mscProjectId || s.mscProjectId === f.mscProjectId);
  const rows = (data?.expenses || []).filter((e: any) => !filter || e.status === filter);

  return (
    <Card
      title={title}
      action={
        !adding && (
          <button className={btnPrimary} onClick={() => setAdding(true)}>
            <Plus size={16} /> Add expense
          </button>
        )
      }
    >
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            ["Total", data.totalOutsourcing, "text-slate-900"],
            ["Paid", data.totalPaid, "text-emerald-700"],
            ["Still to pay", data.totalUnpaid, "text-amber-700"],
          ].map(([k, v, c]) => (
            <div key={k as string} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-400 uppercase">{k}</p>
              <p className={cn("text-lg font-bold", c as string)}>{formatPrice(Number(v))}</p>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <form
          className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await act(() =>
              createOutsourcingExpense({
                mscProjectId: f.mscProjectId,
                studentId: f.studentId || undefined,
                paidTo: f.paidTo,
                description: f.description || undefined,
                amount: Number(f.amount),
                status: f.status,
                notes: f.notes || undefined,
              })
            );
            setBusy(false);
            setAdding(false);
            setF({ ...f, studentId: "", paidTo: "", description: "", amount: "", notes: "", status: "UNPAID" });
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!projectId && (
              <label className="text-xs font-bold text-slate-500">
                Project *
                <select className={inputCls} value={f.mscProjectId} onChange={(e) => setF({ ...f, mscProjectId: e.target.value, studentId: "" })}>
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs font-bold text-slate-500">
              For student
              <select className={inputCls} value={f.studentId} onChange={(e) => setF({ ...f, studentId: e.target.value })}>
                <option value="">Whole project (shared cost)</option>
                {vendorStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Paid to (freelancer / vendor) *
              <input required className={inputCls} value={f.paidTo} onChange={(e) => setF({ ...f, paidTo: e.target.value })} list="vendor-names" />
              <datalist id="vendor-names">
                {(data?.vendors || []).map((v: any) => (
                  <option key={v.vendor} value={v.vendor} />
                ))}
              </datalist>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Amount (£) *
              <input required type="number" min={0} step="0.01" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Paid yet?
              <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}>
                <option value="UNPAID">Not yet: still owe them</option>
                <option value="PAID">Yes, already paid</option>
              </select>
            </label>
            <label className="md:col-span-2 text-xs font-bold text-slate-500">
              Description <span className="font-medium text-slate-400">(optional)</span>
              <input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button className={btnPrimary} disabled={busy || !f.paidTo.trim() || !f.amount || !f.mscProjectId}>
              {busy && <Loader2 size={14} className="animate-spin" />} Save expense
            </button>
          </div>
        </form>
      )}

      {data?.vendors?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">By freelancer / vendor</p>
          <div className="flex flex-wrap gap-2">
            {data.vendors.map((v: any) => (
              <div key={v.vendor} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
                <span className="font-bold text-slate-900">{v.vendor}</span>
                <span className="text-slate-500"> · {formatPrice(v.total)}</span>
                {v.unpaid > 0 ? (
                  <span className="ml-1 text-amber-700 font-semibold">· owe {formatPrice(v.unpaid)}</span>
                ) : (
                  <span className="ml-1 text-emerald-700 font-semibold">· all paid</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-2" role="tablist">
        {(["", "UNPAID", "PAID"] as const).map((k) => (
          <button
            key={k || "all"}
            role="tab"
            aria-selected={filter === k}
            onClick={() => setFilter(k)}
            className={cn("px-3 py-1 rounded-lg text-xs font-semibold border", filter === k ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200")}
          >
            {k === "" ? "All" : k === "UNPAID" ? "To pay" : "Paid"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide">
              <th className="px-2 py-2">Paid to</th>
              <th className="px-2 py-2">For</th>
              {!projectId && <th className="px-2 py-2">Project</th>}
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Logged</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((e: any) => (
              <tr key={e.id}>
                <td className="px-2 py-2.5">
                  <p className="font-semibold text-slate-900">{e.paidTo}</p>
                  {e.description && <p className="text-xs text-slate-500">{e.description}</p>}
                </td>
                <td className="px-2 py-2.5 text-slate-600">{e.student?.name || "Whole project"}</td>
                {!projectId && <td className="px-2 py-2.5 text-slate-600">{e.mscProject?.name}</td>}
                <td className="px-2 py-2.5 font-semibold">{formatPrice(Number(e.amount))}</td>
                <td className="px-2 py-2.5 text-slate-500">{fmtDate(e.paidAt)}</td>
                <td className="px-2 py-2.5">
                  <StatusBadge status={e.status === "PAID" ? "PAID" : "UNPAID"} className={e.status === "PAID" ? "!bg-emerald-50 !text-emerald-700" : "!bg-amber-50 !text-amber-700"} />
                  {e.settledAt && <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(e.settledAt)}</p>}
                </td>
                <td className="px-2 py-2.5 text-right whitespace-nowrap">
                  {e.status === "UNPAID" ? (
                    <button className={btnSecondary + " !py-1 !px-2.5 text-xs"} onClick={() => act(() => updateOutsourcingExpense(e.id, { status: "PAID" }))}>
                      <CheckCircle2 size={12} /> Mark paid
                    </button>
                  ) : (
                    <button className="p-1.5 text-slate-400 hover:text-slate-700" title="Mark unpaid" aria-label="Mark unpaid" onClick={() => act(() => updateOutsourcingExpense(e.id, { status: "UNPAID" }))}>
                      <Undo2 size={14} />
                    </button>
                  )}
                  <button
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    aria-label="Delete expense"
                    onClick={() => window.confirm(`Delete expense to ${e.paidTo}?`) && act(() => deleteOutsourcingExpense(e.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !rows.length && <p className="text-sm text-slate-400 px-2 py-3">No expenses.</p>}
      </div>
    </Card>
  );
}
