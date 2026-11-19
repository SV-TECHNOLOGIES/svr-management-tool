"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Loader2, PoundSterling } from "lucide-react";
import { recordPayment, errorMessage } from "@/lib/api";
import { Card, StatusBadge, inputCls, btnPrimary, btnSecondary } from "@/components/workspace/ui";
import { EnrollModal } from "@/components/workspace/enroll-modal";
import { useCurrencyStore } from "@/store/useCurrencyStore";

function PaymentForm({ student, onDone, onError }: { student: any; onDone: () => void; onError: (m: string) => void }) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap gap-2 items-center mt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return;
        setBusy(true);
        try {
          await recordPayment({ studentId: student.id, amount: Number(amount), status: "RECEIVED", notes: notes || undefined });
          onDone();
        } catch (err) {
          onError(errorMessage(err, "Failed to record payment"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="number" min={0} step="0.01" className={inputCls + " w-28"} placeholder="Amount £" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Payment amount" autoFocus />
      <input className={inputCls + " flex-1 min-w-[10rem]"} placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Payment note" />
      <button className={btnPrimary} disabled={busy || !amount}>
        {busy && <Loader2 size={14} className="animate-spin" />} Save payment
      </button>
    </form>
  );
}

export function StudentsPanel({ project, onChange, onError }: { project: any; onChange: () => void; onError: (m: string) => void }) {
  const { formatPrice } = useCurrencyStore();
  const [enrolling, setEnrolling] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const students: any[] = project.students || [];

  return (
    <Card
      title={`Students (${students.length})`}
      action={
        <button className={btnPrimary} onClick={() => setEnrolling(true)}>
          <Plus size={16} /> Enroll / tag student
        </button>
      }
    >
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide">
              <th className="px-2 py-2">Student</th>
              <th className="px-2 py-2">Stages</th>
              <th className="px-2 py-2">Agreed</th>
              <th className="px-2 py-2">Paid</th>
              <th className="px-2 py-2">Due</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => {
              const paid = (s.payments || []).filter((p: any) => p.status === "RECEIVED").reduce((a: number, p: any) => a + Number(p.amount), 0);
              const due = Number(s.agreedAmount) - paid;
              const done = (s.submissions || []).filter((x: any) => x.status === "COMPLETED").length;
              return (
                <React.Fragment key={s.id}>
                  <tr className="align-top">
                    <td className="px-2 py-3">
                      <Link href={`/students/${s.id}`} className="font-bold text-slate-900 hover:text-primary">
                        {s.name}
                      </Link>
                      {s.projectTitle && <p className="text-xs text-slate-500 max-w-xs truncate">{s.projectTitle}</p>}
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      {done}/{s.submissions?.length || 0}
                    </td>
                    <td className="px-2 py-3">{formatPrice(Number(s.agreedAmount))}</td>
                    <td className="px-2 py-3 text-emerald-700 font-semibold">{formatPrice(paid)}</td>
                    <td className={"px-2 py-3 font-semibold " + (due > 0 ? "text-amber-700" : "text-slate-400")}>{formatPrice(due)}</td>
                    <td className="px-2 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button className={btnSecondary + " !py-1.5 !px-3 text-xs"} onClick={() => setPaying(paying === s.id ? null : s.id)}>
                        <PoundSterling size={14} /> Payment
                      </button>
                    </td>
                  </tr>
                  {paying === s.id && (
                    <tr>
                      <td colSpan={7} className="px-2 pb-3">
                        <PaymentForm
                          student={s}
                          onError={onError}
                          onDone={() => {
                            setPaying(null);
                            onChange();
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {!students.length && <p className="text-sm text-slate-400 px-2 py-3">No students yet. Enroll a new student or tag an existing one.</p>}
      </div>

      {enrolling && (
        <EnrollModal
          projects={[project]}
          projectId={project.id}
          onClose={() => setEnrolling(false)}
          onDone={() => {
            setEnrolling(false);
            onChange();
          }}
        />
      )}
    </Card>
  );
}
