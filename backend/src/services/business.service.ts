import { DeliveryStatus, ExpenseStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { badRequest, notFound } from './errors';
import { LinkInput, parseLinkType, enrollStudent } from './workspace.service';

/**
 * People (students across projects), project deliverables, outsourcing expenses,
 * per-project finance / admin split, and the "my work" board.
 * Shared by the REST API and the MCP server.
 */

const num = (v: unknown) => Number(v || 0);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** Everyone, with the projects they are enrolled in. Used by the "tag existing student" picker. */
export const listPeople = async (search?: string) => {
  const people = await prisma.person.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { rollNo: { contains: search, mode: 'insensitive' } },
            { mobileNo: { contains: search } },
          ],
        }
      : {},
    include: {
      enrollments: {
        select: { id: true, status: true, projectTitle: true, mscProject: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });
  return people.map((p) => ({
    id: p.id,
    name: p.name,
    mobileNo: p.mobileNo,
    rollNo: p.rollNo,
    email: p.email,
    enrollments: p.enrollments.map((e) => ({
      studentId: e.id,
      projectId: e.mscProject.id,
      projectName: e.mscProject.name,
      projectTitle: e.projectTitle,
      status: e.status,
    })),
  }));
};

/** Update an enrollment; contact fields are written to the person and every enrollment of theirs. */
export const updateEnrollment = async (
  id: string,
  data: {
    name?: string;
    mobileNo?: string;
    rollNo?: string | null;
    email?: string | null;
    projectTitle?: string | null;
    agreedAmount?: number;
    status?: string;
    meetingDay?: string | null;
  }
) => {
  const st = await prisma.student.findUnique({ where: { id } });
  if (!st) throw notFound('Student not found');

  const contact: Record<string, unknown> = {};
  if (data.name) contact.name = data.name;
  if (data.mobileNo) contact.mobileNo = data.mobileNo;
  if (data.rollNo !== undefined) contact.rollNo = data.rollNo || null;
  if (data.email !== undefined) contact.email = data.email || null;

  return prisma.$transaction(async (tx) => {
    if (Object.keys(contact).length) {
      await tx.person.update({ where: { id: st.personId }, data: contact });
      await tx.student.updateMany({
        where: { personId: st.personId },
        data: { ...contact, ...(contact.rollNo !== undefined && { rollNo: (contact.rollNo as string) || '' }) },
      });
    }
    return tx.student.update({
      where: { id },
      data: {
        ...(data.projectTitle !== undefined && { projectTitle: data.projectTitle || null }),
        ...(data.agreedAmount !== undefined && { agreedAmount: Number(data.agreedAmount) }),
        ...(data.status && { status: data.status as any }),
        ...(data.meetingDay !== undefined && { meetingDay: data.meetingDay || null }),
      },
    });
  });
};

// ---------------------------------------------------------------------------
// Project deliverables (one definition, one delivery per student)
// ---------------------------------------------------------------------------

const linkRows = (links?: LinkInput[]) =>
  (links || []).filter((l) => l?.url).map((l) => ({ url: l.url, type: parseLinkType(l.type, l.url), label: l.label || null }));

export const listProjectDeliverables = async (mscProjectId: string) => {
  const items = await prisma.projectDeliverable.findMany({
    where: { mscProjectId },
    include: {
      deliveries: {
        include: { student: { select: { id: true, name: true, status: true } }, links: true },
        orderBy: { student: { name: 'asc' } },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });
  const now = new Date();
  return items.map((d) => {
    const active = d.deliveries.filter((x) => x.student.status !== 'DROPPED');
    const delivered = active.filter((x) => x.status !== 'PLANNED').length;
    return {
      id: d.id,
      title: d.title,
      description: d.description,
      dueDate: d.dueDate,
      createdAt: d.createdAt,
      delivered,
      total: active.length,
      overdue: !!d.dueDate && d.dueDate < now && delivered < active.length,
      students: d.deliveries.map((x) => ({
        deliveryId: x.id,
        studentId: x.student.id,
        student: x.student.name,
        studentStatus: x.student.status,
        status: x.status,
        sentAt: x.sentAt,
        acknowledgedAt: x.acknowledgedAt,
        channel: x.channel,
        links: x.links,
      })),
    };
  });
};

/** Define a deliverable for a project; creates a PLANNED delivery for every active student. */
export const createProjectDeliverable = async (
  mscProjectId: string,
  input: { title: string; description?: string | null; dueDate?: string | Date | null; links?: LinkInput[] },
  adminId?: string | null
) => {
  if (!input.title) throw badRequest('title is required');
  const project = await prisma.mscProject.findUnique({
    where: { id: mscProjectId },
    include: { students: { where: { status: { in: ['ACTIVE', 'ON_HOLD'] } }, select: { id: true } } },
  });
  if (!project) throw notFound('Project not found');
  const due = input.dueDate ? new Date(input.dueDate) : null;
  const rows = linkRows(input.links);

  const deliverable = await prisma.projectDeliverable.create({
    data: { mscProjectId, title: input.title, description: input.description || null, dueDate: due, createdByAdminId: adminId || null },
  });
  for (const s of project.students) {
    await prisma.delivery.create({
      data: {
        studentId: s.id,
        projectDeliverableId: deliverable.id,
        title: input.title,
        description: input.description || null,
        status: DeliveryStatus.PLANNED,
        scheduledFor: due,
        links: { create: rows },
      },
    });
  }
  return (await listProjectDeliverables(mscProjectId)).find((d) => d.id === deliverable.id);
};

export const updateProjectDeliverable = async (
  id: string,
  input: { title?: string; description?: string | null; dueDate?: string | Date | null }
) => {
  const d = await prisma.projectDeliverable.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate ? new Date(input.dueDate) : null }),
    },
  });
  // keep the not-yet-sent copies in sync
  await prisma.delivery.updateMany({
    where: { projectDeliverableId: id, status: DeliveryStatus.PLANNED },
    data: { title: d.title, description: d.description, scheduledFor: d.dueDate },
  });
  return d;
};

export const deleteProjectDeliverable = async (id: string) => {
  await prisma.projectDeliverable.delete({ where: { id } });
  return { deleted: true };
};

/** Mark a project deliverable as sent to several (or all remaining) students at once. */
export const markDeliverableSent = async (
  id: string,
  opts: { studentIds?: string[]; channel?: string | null; links?: LinkInput[] },
  adminId?: string | null
) => {
  const pending = await prisma.delivery.findMany({
    where: {
      projectDeliverableId: id,
      status: DeliveryStatus.PLANNED,
      ...(opts.studentIds?.length && { studentId: { in: opts.studentIds } }),
    },
  });
  const rows = linkRows(opts.links);
  for (const d of pending) {
    await prisma.delivery.update({
      where: { id: d.id },
      data: {
        status: DeliveryStatus.SENT,
        sentAt: new Date(),
        sentByAdminId: adminId || null,
        ...(opts.channel && { channel: opts.channel }),
        ...(rows.length && { links: { create: rows } }),
      },
    });
  }
  return { updated: pending.length };
};

// ---------------------------------------------------------------------------
// Outsourcing / expenses
// ---------------------------------------------------------------------------

export type ExpenseInput = {
  mscProjectId: string;
  studentId?: string | null;
  paidTo: string;
  description?: string | null;
  amount: number;
  status?: string;
  paidAt?: string | Date | null;
  settledAt?: string | Date | null;
  notes?: string | null;
};

const parseExpenseStatus = (s?: string) => {
  if (!s) return undefined;
  const up = s.toUpperCase();
  if (!(Object.values(ExpenseStatus) as string[]).includes(up)) throw badRequest('status must be UNPAID or PAID');
  return up as ExpenseStatus;
};

const expenseInclude = {
  mscProject: { select: { id: true, name: true } },
  student: { select: { id: true, name: true, rollNo: true, projectTitle: true } },
  recordedByAdmin: { select: { id: true, name: true } },
} satisfies Prisma.OutsourcingInclude;

export const createExpense = async (input: ExpenseInput, adminId?: string | null) => {
  if (!input.mscProjectId) throw badRequest('Project is required');
  if (!input.paidTo) throw badRequest('Paid to (vendor / freelancer) is required');
  if (input.amount === undefined || isNaN(Number(input.amount)) || Number(input.amount) <= 0) {
    throw badRequest('A positive amount is required');
  }
  const status = parseExpenseStatus(input.status) || ExpenseStatus.UNPAID;
  return prisma.outsourcing.create({
    data: {
      mscProjectId: input.mscProjectId,
      studentId: input.studentId || null,
      paidTo: input.paidTo.trim(),
      description: input.description || null,
      amount: Number(input.amount),
      status,
      ...(input.paidAt && { paidAt: new Date(input.paidAt) }),
      settledAt: status === ExpenseStatus.PAID ? (input.settledAt ? new Date(input.settledAt) : new Date()) : null,
      notes: input.notes || null,
      recordedByAdminId: adminId || null,
    },
    include: expenseInclude,
  });
};

/**
 * Log the same expense for several students at once: one row per student, all in one transaction.
 * amountMode 'PER_STUDENT' (default): `amount` is charged to each student.
 * amountMode 'SPLIT': `amount` is the total, divided equally (to the penny; any rounding remainder goes to the first student).
 */
export const createExpensesForStudents = async (
  input: Omit<ExpenseInput, 'studentId'> & { studentIds: string[]; amountMode?: 'PER_STUDENT' | 'SPLIT' },
  adminId?: string | null
) => {
  const ids = [...new Set((input.studentIds || []).filter(Boolean))];
  if (!ids.length) throw badRequest('Select at least one student');
  if (!input.mscProjectId) throw badRequest('Project is required');
  if (!input.paidTo) throw badRequest('Paid to (vendor / freelancer) is required');
  const amount = Number(input.amount);
  if (isNaN(amount) || amount <= 0) throw badRequest('A positive amount is required');
  const status = parseExpenseStatus(input.status) || ExpenseStatus.UNPAID;

  const found = await prisma.student.findMany({ where: { id: { in: ids }, mscProjectId: input.mscProjectId }, select: { id: true } });
  if (found.length !== ids.length) throw badRequest('Some selected students are not in this project');

  let amounts: number[];
  if (input.amountMode === 'SPLIT') {
    const cents = Math.round(amount * 100);
    const each = Math.floor(cents / ids.length);
    amounts = ids.map((_, i) => (each + (i === 0 ? cents - each * ids.length : 0)) / 100);
  } else {
    amounts = ids.map(() => amount);
  }

  const settledAt = status === ExpenseStatus.PAID ? (input.settledAt ? new Date(input.settledAt) : new Date()) : null;
  return prisma.$transaction(
    ids.map((studentId, i) =>
      prisma.outsourcing.create({
        data: {
          mscProjectId: input.mscProjectId,
          studentId,
          paidTo: input.paidTo.trim(),
          description: input.description || null,
          amount: amounts[i],
          status,
          ...(input.paidAt && { paidAt: new Date(input.paidAt) }),
          settledAt,
          notes: input.notes || null,
          recordedByAdminId: adminId || null,
        },
        include: expenseInclude,
      })
    )
  );
};

export const updateExpense = async (id: string, input: Partial<ExpenseInput>) => {
  const status = parseExpenseStatus(input.status);
  return prisma.outsourcing.update({
    where: { id },
    data: {
      ...(input.paidTo !== undefined && { paidTo: input.paidTo }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.amount !== undefined && { amount: Number(input.amount) }),
      ...(input.studentId !== undefined && { studentId: input.studentId || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(status && {
        status,
        settledAt: status === ExpenseStatus.PAID ? (input.settledAt ? new Date(input.settledAt) : new Date()) : null,
      }),
    },
    include: expenseInclude,
  });
};

export const listExpenses = async (filter: { mscProjectId?: string; studentId?: string; status?: string; paidTo?: string }) => {
  const expenses = await prisma.outsourcing.findMany({
    where: {
      ...(filter.mscProjectId && { mscProjectId: filter.mscProjectId }),
      ...(filter.studentId && { studentId: filter.studentId }),
      ...(filter.status && { status: parseExpenseStatus(filter.status) }),
      ...(filter.paidTo && { paidTo: { equals: filter.paidTo, mode: 'insensitive' } }),
    },
    include: expenseInclude,
    orderBy: { paidAt: 'desc' },
  });

  // Per-vendor summary: how much we owe / have paid each freelancer
  const vendors = new Map<string, { vendor: string; total: number; paid: number; unpaid: number; count: number }>();
  for (const e of expenses) {
    const key = e.paidTo.trim().toLowerCase();
    const v = vendors.get(key) || { vendor: e.paidTo.trim(), total: 0, paid: 0, unpaid: 0, count: 0 };
    v.total += num(e.amount);
    v.count += 1;
    if (e.status === ExpenseStatus.PAID) v.paid += num(e.amount);
    else v.unpaid += num(e.amount);
    vendors.set(key, v);
  }

  const total = expenses.reduce((a, e) => a + num(e.amount), 0);
  const unpaid = expenses.filter((e) => e.status === ExpenseStatus.UNPAID).reduce((a, e) => a + num(e.amount), 0);
  return {
    totalOutsourcing: total,
    totalPaid: total - unpaid,
    totalUnpaid: unpaid,
    perStudent: expenses.filter((e) => e.studentId).reduce((a, e) => a + num(e.amount), 0),
    projectWide: expenses.filter((e) => !e.studentId).reduce((a, e) => a + num(e.amount), 0),
    vendors: [...vendors.values()].sort((a, b) => b.unpaid - a.unpaid || b.total - a.total),
    expenses,
  };
};

// ---------------------------------------------------------------------------
// Finance: per project, with admin split per project
// ---------------------------------------------------------------------------

export const projectFinance = async (mscProjectId?: string) => {
  const projects = await prisma.mscProject.findMany({
    where: mscProjectId ? { id: mscProjectId } : {},
    include: {
      adminSplits: { include: { admin: { select: { id: true, name: true } } } },
      students: { include: { payments: true } },
      outsourcings: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const perProject = projects.map((p) => {
    const agreed = p.students.reduce((a, s) => a + num(s.agreedAmount), 0);
    const received = p.students.reduce(
      (a, s) => a + s.payments.filter((x) => x.status === 'RECEIVED').reduce((b, x) => b + num(x.amount), 0),
      0
    );
    const expenses = p.outsourcings.reduce((a, o) => a + num(o.amount), 0);
    const expensesPaid = p.outsourcings.filter((o) => o.status === 'PAID').reduce((a, o) => a + num(o.amount), 0);
    const net = received - expenses;
    const projectedProfit = agreed - expenses; // if every student pays their agreed amount
    const splitTotal = p.adminSplits.reduce((a, s) => a + num(s.percentage), 0);
    return {
      projectId: p.id,
      projectName: p.name,
      currency: p.currency,
      students: p.students.length,
      agreedRevenue: agreed,
      received,
      outstanding: agreed - received,
      expenses,
      expensesPaid,
      expensesUnpaid: expenses - expensesPaid,
      netProfit: net,
      projectedProfit,
      splitTotal,
      splits: p.adminSplits.map((s) => ({
        adminId: s.adminId,
        adminName: s.admin.name,
        percentage: num(s.percentage),
        shareOfReceived: (received * num(s.percentage)) / 100,
        shareOfProfit: (net * num(s.percentage)) / 100,
        shareOfProjectedProfit: (projectedProfit * num(s.percentage)) / 100,
      })),
    };
  });

  // Totals per admin across projects
  const admins = new Map<string, { adminId: string; adminName: string; shareOfReceived: number; shareOfProfit: number; shareOfProjectedProfit: number; projects: { projectName: string; percentage: number }[] }>();
  for (const p of perProject) {
    for (const s of p.splits) {
      const a = admins.get(s.adminId) || { adminId: s.adminId, adminName: s.adminName, shareOfReceived: 0, shareOfProfit: 0, shareOfProjectedProfit: 0, projects: [] };
      a.shareOfReceived += s.shareOfReceived;
      a.shareOfProfit += s.shareOfProfit;
      a.shareOfProjectedProfit += s.shareOfProjectedProfit;
      a.projects.push({ projectName: p.projectName, percentage: s.percentage });
      admins.set(s.adminId, a);
    }
  }

  const totals = perProject.reduce(
    (t, p) => ({
      agreedRevenue: t.agreedRevenue + p.agreedRevenue,
      received: t.received + p.received,
      outstanding: t.outstanding + p.outstanding,
      expenses: t.expenses + p.expenses,
      netProfit: t.netProfit + p.netProfit,
      projectedProfit: t.projectedProfit + p.projectedProfit,
    }),
    { agreedRevenue: 0, received: 0, outstanding: 0, expenses: 0, netProfit: 0, projectedProfit: 0 }
  );

  return { perProject, perAdmin: [...admins.values()], totals };
};

/** Replace a project's admin split. Percentages must add up to 100. */
export const setAdminSplits = async (mscProjectId: string, splits: { adminId: string; percentage: number }[]) => {
  const clean = (splits || []).filter((s) => s.adminId && Number(s.percentage) > 0);
  const total = clean.reduce((a, s) => a + Number(s.percentage), 0);
  if (clean.length && Math.abs(total - 100) > 0.01) throw badRequest(`Split must add up to 100% (currently ${total}%)`);
  await prisma.$transaction([
    prisma.adminSplit.deleteMany({ where: { mscProjectId } }),
    ...clean.map((s) => prisma.adminSplit.create({ data: { mscProjectId, adminId: s.adminId, percentage: Number(s.percentage) } })),
  ]);
  return prisma.adminSplit.findMany({ where: { mscProjectId }, include: { admin: { select: { id: true, name: true } } } });
};

// ---------------------------------------------------------------------------
// My work
// ---------------------------------------------------------------------------

export const getMyWork = async (adminId: string, opts: { scope?: 'mine' | 'all' } = {}) => {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const activeStudent = { status: { in: ['ACTIVE', 'ON_HOLD'] as any } };
  const mine = opts.scope !== 'all';

  const [tasks, toReview, waitingOnOthers, deliveries, deadlines, unpaidExpenses] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(mine && { OR: [{ assigneeAdminId: adminId }, { assigneeAdminId: null }] }),
        OR: [{ studentId: null }, { student: activeStudent }],
      },
      include: {
        student: { select: { id: true, name: true } },
        mscProject: { select: { id: true, name: true } },
        assigneeAdmin: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { order: 'asc' }],
    }),
    // submitted by someone else: I can review these
    prisma.submission.findMany({
      where: {
        status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        student: activeStudent,
        ...(mine && { NOT: { submittedByAdminId: adminId } }),
      },
      include: {
        student: { select: { id: true, name: true, mscProject: { select: { name: true } } } },
        submissionTemplate: { select: { name: true } },
        submittedByAdmin: { select: { name: true } },
      },
      orderBy: { submittedAt: 'asc' },
    }),
    // submitted by me, waiting for someone else's review
    prisma.submission.findMany({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] }, submittedByAdminId: adminId, student: activeStudent },
      include: { student: { select: { id: true, name: true } }, submissionTemplate: { select: { name: true } } },
    }),
    prisma.delivery.findMany({
      where: { status: 'PLANNED', student: activeStudent, OR: [{ scheduledFor: null }, { scheduledFor: { lte: week } }] },
      include: { student: { select: { id: true, name: true, mscProject: { select: { name: true } } } } },
      orderBy: { scheduledFor: 'asc' },
    }),
    prisma.submission.findMany({
      where: { status: { notIn: ['COMPLETED'] }, deadline: { lte: week }, student: activeStudent },
      include: {
        student: { select: { id: true, name: true, mscProject: { select: { name: true } } } },
        submissionTemplate: { select: { name: true } },
      },
      orderBy: { deadline: 'asc' },
    }),
    prisma.outsourcing.findMany({
      where: { status: 'UNPAID' },
      include: { mscProject: { select: { id: true, name: true } }, student: { select: { name: true } } },
      orderBy: { paidAt: 'asc' },
    }),
  ]);

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      dueDate: t.dueDate,
      overdue: !!t.dueDate && t.dueDate < now && t.status !== 'DONE',
      student: t.student,
      project: t.mscProject,
      assignee: t.assigneeAdmin,
    })),
    toReview: toReview.map((s) => ({
      submissionId: s.id,
      studentId: s.student.id,
      student: s.student.name,
      project: s.student.mscProject.name,
      stage: s.submissionTemplate.name,
      submittedBy: s.submittedByAdmin?.name || null,
      submittedAt: s.submittedAt,
    })),
    waitingOnOthers: waitingOnOthers.map((s) => ({
      submissionId: s.id,
      studentId: s.student.id,
      student: s.student.name,
      stage: s.submissionTemplate.name,
    })),
    deliveriesToSend: deliveries.map((d) => ({
      deliveryId: d.id,
      studentId: d.student.id,
      student: d.student.name,
      project: d.student.mscProject.name,
      title: d.title,
      scheduledFor: d.scheduledFor,
      overdue: !!d.scheduledFor && d.scheduledFor < now,
    })),
    deadlines: deadlines.map((s) => ({
      submissionId: s.id,
      studentId: s.student.id,
      student: s.student.name,
      project: s.student.mscProject.name,
      stage: s.submissionTemplate.name,
      status: s.status,
      deadline: s.deadline,
      overdue: s.deadline < now,
    })),
    unpaidExpenses: unpaidExpenses.map((e) => ({
      id: e.id,
      paidTo: e.paidTo,
      amount: num(e.amount),
      description: e.description,
      project: e.mscProject,
      student: e.student?.name || null,
    })),
  };
};

// ---------------------------------------------------------------------------
// Enrollment helpers, payments, deletes
// ---------------------------------------------------------------------------

/** Agreed amount of the most recently enrolled student in a project (used as the default price). */
export const lastAgreedAmount = async (mscProjectId: string) => {
  const last = await prisma.student.findFirst({ where: { mscProjectId }, orderBy: { createdAt: 'desc' } });
  return last ? num(last.agreedAmount) : null;
};

/** Enroll several existing people into a project at once. Returns created and skipped (already enrolled / failed). */
export const enrollMany = async (
  mscProjectId: string,
  personIds: string[],
  opts: { agreedAmount?: number; projectTitle?: string | null; advancePaid?: number },
  adminId?: string | null
) => {
  if (!personIds?.length) throw badRequest('Choose at least one student');
  const amount = opts.agreedAmount ?? (await lastAgreedAmount(mscProjectId));
  if (amount === null || amount === undefined) throw badRequest('Agreed amount is required (no previous student to copy it from)');
  const created: { studentId: string; name: string }[] = [];
  const skipped: { personId: string; reason: string }[] = [];
  for (const personId of personIds) {
    try {
      const s = await enrollStudent(
        { mscProjectId, personId, agreedAmount: amount, projectTitle: opts.projectTitle, advancePaid: opts.advancePaid },
        adminId
      );
      created.push({ studentId: s.id, name: s.name });
    } catch (e) {
      skipped.push({ personId, reason: (e as Error).message });
    }
  }
  return { agreedAmount: amount, created, skipped };
};

export const listPayments = async (filter: { mscProjectId?: string; studentId?: string }) =>
  prisma.payment.findMany({
    where: {
      ...(filter.studentId && { studentId: filter.studentId }),
      ...(filter.mscProjectId && { student: { mscProjectId: filter.mscProjectId } }),
    },
    include: {
      student: { select: { id: true, name: true, mscProject: { select: { id: true, name: true } } } },
      submission: { include: { submissionTemplate: { select: { name: true } } } },
      recordedByAdmin: { select: { name: true } },
    },
    orderBy: [{ receivedAt: 'desc' }],
  });

export const updatePayment = async (
  id: string,
  data: { amount?: number; status?: string; notes?: string | null; receivedAt?: string | Date | null }
) => {
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) throw notFound('Payment not found');
  const status = data.status ? data.status.toUpperCase() : undefined;
  if (status && !['PENDING', 'RECEIVED', 'PARTIAL'].includes(status)) throw badRequest('status must be PENDING, RECEIVED or PARTIAL');
  return prisma.payment.update({
    where: { id },
    data: {
      ...(data.amount !== undefined && { amount: Number(data.amount) }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(status && { status: status as any }),
      ...(data.receivedAt !== undefined
        ? { receivedAt: data.receivedAt ? new Date(data.receivedAt) : null }
        : status === 'RECEIVED' && !existing.receivedAt
          ? { receivedAt: new Date() }
          : {}),
    },
  });
};

export const deletePayment = async (id: string) => {
  await prisma.payment.delete({ where: { id } });
  return { deleted: true };
};

export const deleteExpense = async (id: string) => {
  await prisma.outsourcing.delete({ where: { id } });
  return { deleted: true };
};

/** Remove a student from a project (their stages, tasks, deliveries, payments for this project). The person record is kept. */
export const unenrollStudent = async (id: string) => {
  const st = await prisma.student.findUnique({ where: { id } });
  if (!st) throw notFound('Student not found');
  await prisma.$transaction([
    prisma.outsourcing.updateMany({ where: { studentId: id }, data: { studentId: null } }),
    prisma.student.delete({ where: { id } }),
  ]);
  return { deleted: true, name: st.name };
};

/** Delete a whole project and everything in it. */
export const deleteProject = async (id: string) => {
  const p = await prisma.mscProject.findUnique({ where: { id } });
  if (!p) throw notFound('Project not found');
  await prisma.$transaction([
    prisma.outsourcing.deleteMany({ where: { mscProjectId: id } }),
    prisma.student.deleteMany({ where: { mscProjectId: id } }),
    prisma.mscProject.delete({ where: { id } }),
  ]);
  return { deleted: true, name: p.name };
};
