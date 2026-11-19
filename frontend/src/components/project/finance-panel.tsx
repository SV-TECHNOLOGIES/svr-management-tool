"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Save, Plus, X, Loader2 } from "lucide-react";
import { getProjectFinance, setProjectSplits, getAdmins, errorMessage } from "@/lib/api";
import { Card, inputCls, btnPrimary, btnSecondary } from "@/components/workspace/ui";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { cn } from "@/lib/utils";

/** Money for one project: revenue, received, expenses, profit and the admin split for this project. */
export function FinancePanel({ projectId, refreshKey, onError }: { projectId: string; refreshKey?: number; onError: (m: string) => void }) {
  const { formatPrice } = useCurrencyStore();
  const [fin, setFin] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<{ adminId: string; percentage: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, a] = await Promise.all([getProjectFinance(projectId), getAdmins()]);
      setFin(f.perProject[0]);
      setAdmins(a);
    } catch (e) {
      onError(errorMessage(e, "Failed to load finance"));
    }
  }, [projectId, onError]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!fin) return <Card title="Money & split"><Loader2 className="w-5 h-5 animate-spin text-primary" /></Card>;

  const total = rows.reduce((a, r) => a + Number(r.percentage || 0), 0);

  return (
    <Card title="Money & admin split">
      {(() => {
        const Stat = ({ k, v, c, sub }: { k: string; v: number; c: string; sub?: string }) => (
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase">{k}</p>
            <p className={cn("text-lg font-bold", c)}>{formatPrice(v)}</p>
            {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
          </div>
        );
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-900 mb-3">So far <span className="font-medium text-slate-500">(money actually received)</span></p>
              <div className="grid grid-cols-3 gap-2">
                <Stat k="Received" v={fin.received} c="text-emerald-700" sub={`${formatPrice(fin.outstanding)} still owed`} />
                <Stat k="Expenses" v={fin.expenses} c="text-rose-700" sub={fin.expensesUnpaid > 0 ? `${formatPrice(fin.expensesUnpaid)} unpaid` : "all paid"} />
                <Stat k="Net profit" v={fin.netProfit} c="text-violet-700" sub="received − expenses" />
              </div>
            </div>
            <div className="bg-violet-50/60 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-900 mb-3">If every student pays in full <span className="font-medium text-slate-500">(agreed amounts)</span></p>
              <div className="grid grid-cols-3 gap-2">
                <Stat k="Agreed" v={fin.agreedRevenue} c="text-slate-900" sub={`${fin.students} students`} />
                <Stat k="Expenses" v={fin.expenses} c="text-rose-700" sub="logged so far" />
                <Stat k="Net profit" v={fin.projectedProfit} c="text-violet-700" sub="agreed − expenses" />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">
          Admin split for this project
          <span className={cn("ml-2 text-xs font-semibold", fin.splitTotal === 100 ? "text-emerald-600" : "text-amber-600")}>{fin.splitTotal}%</span>
        </h3>
        {!editing && (
          <button
            className={btnSecondary}
            onClick={() => {
              setRows(fin.splits.map((s: any) => ({ adminId: s.adminId, percentage: s.percentage })));
              setEditing(true);
            }}
          >
            <Pencil size={14} /> Edit split
          </button>
        )}
      </div>

      {editing ? (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await setProjectSplits(projectId, rows);
              setEditing(false);
              await load();
            } catch (err) {
              onError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select className={inputCls + " flex-1"} value={r.adminId} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, adminId: e.target.value } : x)))} aria-label="Admin">
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input type="number" min={0} max={100} className={inputCls + " w-24"} value={r.percentage} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, percentage: Number(e.target.value) } : x)))} aria-label="Percentage" />
              <span className="text-sm text-slate-500">%</span>
              <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-rose-600" aria-label="Remove">
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setRows([...rows, { adminId: admins.find((a) => !rows.some((r) => r.adminId === a.id))?.id || admins[0]?.id, percentage: 0 }])}>
              <Plus size={14} /> Add admin
            </button>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-bold", total === 100 ? "text-emerald-600" : "text-rose-600")}>Total {total}%</span>
              <button type="button" className={btnSecondary} onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className={btnPrimary} disabled={busy || total !== 100}>
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </form>
      ) : fin.splits.length ? (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide">
                <th className="px-2 py-2">Admin</th>
                <th className="px-2 py-2">Share</th>
                <th className="px-2 py-2">Of received so far</th>
                <th className="px-2 py-2">Profit share so far</th>
                <th className="px-2 py-2">Profit share if fully paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fin.splits.map((s: any) => (
                <tr key={s.adminId}>
                  <td className="px-2 py-2.5 font-semibold text-slate-900">{s.adminName}</td>
                  <td className="px-2 py-2.5">{s.percentage}%</td>
                  <td className="px-2 py-2.5">{formatPrice(s.shareOfReceived)}</td>
                  <td className="px-2 py-2.5 font-semibold text-violet-700">{formatPrice(s.shareOfProfit)}</td>
                  <td className="px-2 py-2.5 font-bold text-violet-800">{formatPrice(s.shareOfProjectedProfit)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200">
                <td className="px-2 py-2.5 font-bold text-slate-900">Total</td>
                <td className="px-2 py-2.5">{fin.splitTotal}%</td>
                <td className="px-2 py-2.5">{formatPrice(fin.received)}</td>
                <td className="px-2 py-2.5 font-semibold text-violet-700">{formatPrice(fin.netProfit)}</td>
                <td className="px-2 py-2.5 font-bold text-violet-800">{formatPrice(fin.projectedProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-400">No split set for this project.</p>
      )}
    </Card>
  );
}
