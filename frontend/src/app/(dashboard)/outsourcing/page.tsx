"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getMscProjects, getStudents, errorMessage } from "@/lib/api";
import { ExpensesPanel } from "@/components/project/expenses-panel";
import { ErrorBanner } from "@/components/workspace/ui";

export default function OutsourcingPage() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; mscProjectId: string }[]>([]);
  const [error, setError] = useState("");
  const showError = useCallback((m: string) => setError(m), []);

  useEffect(() => {
    Promise.all([getMscProjects(), getStudents()])
      .then(([p, s]) => {
        setProjects(p.map((x: any) => ({ id: x.id, name: x.name })));
        setStudents(s.map((x: any) => ({ id: x.id, name: x.name, mscProjectId: x.mscProjectId })));
      })
      .catch((e) => setError(errorMessage(e, "Failed to load projects")));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Outsourcing & expenses</h1>
        <p className="text-slate-500 mt-1">
          What you pay freelancers and vendors across all projects, and who you still owe. You can also manage this from each project&apos;s Expenses tab.
        </p>
      </div>
      <ErrorBanner message={error} onClose={() => setError("")} />
      <ExpensesPanel title="All expenses" projects={projects} students={students} onError={showError} />
    </div>
  );
}
