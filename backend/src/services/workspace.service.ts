import { DeliveryStatus, LinkType, Prisma, SubmissionStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { badRequest, notFound } from './errors';

/**
 * Business logic for the project sprint workspace:
 * project brief + templates, per-student links, deliveries, tasks, notes, and
 * the submission lifecycle. Used by both the REST API and the MCP server.
 */

const DAY = 24 * 60 * 60 * 1000;

const LINK_TYPES = Object.values(LinkType) as string[];

/** Guess a link type from a URL / filename when none is given. */
export const guessLinkType = (url: string): LinkType => {
  const u = url.toLowerCase();
  if (u.includes('github.com') || u.includes('gitlab')) return LinkType.GITHUB;
  if (u.includes('colab.research') || u.endsWith('.ipynb')) return LinkType.COLAB;
  if (u.includes('docs.google.com/presentation') || u.includes('.ppt')) return LinkType.PPT;
  if (u.includes('docs.google.com/document')) return LinkType.GOOGLE_DOC;
  if (u.includes('kaggle.com') || u.includes('huggingface.co/datasets')) return LinkType.DATASET;
  if (u.includes('drive.google.com')) return LinkType.DRIVE;
  if (u.endsWith('.docx') || u.endsWith('.pdf')) return LinkType.REPORT;
  return LinkType.OTHER;
};

export const parseLinkType = (t?: string | null, url?: string): LinkType => {
  if (t) {
    const up = t.toUpperCase();
    if (!LINK_TYPES.includes(up)) throw badRequest(`Invalid link type "${t}". Use one of ${LINK_TYPES.join(', ')}`);
    return up as LinkType;
  }
  return url ? guessLinkType(url) : LinkType.OTHER;
};

export type LinkInput = { url: string; type?: string | null; label?: string | null };

const linkRows = (links: LinkInput[] | undefined) =>
  (links || [])
    .filter((l) => l && l.url)
    .map((l) => ({ url: l.url, type: parseLinkType(l.type, l.url), label: l.label || null }));

// ---------------------------------------------------------------------------
// Admin resolution
// ---------------------------------------------------------------------------

/** Resolve an admin by id or email; falls back to the given default id. */
export const resolveAdminId = async (ref?: string | null, fallbackId?: string | null) => {
  if (ref) {
    const admin = await prisma.admin.findFirst({
      where: { OR: [{ id: ref }, { email: { equals: ref, mode: 'insensitive' } }, { name: { equals: ref, mode: 'insensitive' } }] },
    });
    if (!admin) throw badRequest(`Admin "${ref}" not found`);
    return admin.id;
  }
  return fallbackId || null;
};

// ---------------------------------------------------------------------------
// Projects, templates and task templates
// ---------------------------------------------------------------------------

export const projectInclude = {
  submissionTemplates: { orderBy: { order: 'asc' } },
  taskTemplates: { orderBy: { order: 'asc' } },
  adminSplits: { include: { admin: { select: { id: true, name: true, email: true } } } },
} satisfies Prisma.MscProjectInclude;

export const getProject = async (id: string) => {
  const project = await prisma.mscProject.findUnique({
    where: { id },
    include: {
      ...projectInclude,
      students: {
        select: { id: true, name: true, projectTitle: true, status: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!project) throw notFound('Project not found');
  return project;
};

/** Find a project by id or (case-insensitive) name. */
export const findProject = async (ref: string) => {
  const p = await prisma.mscProject.findFirst({
    where: { OR: [{ id: ref }, { name: { equals: ref, mode: 'insensitive' } }, { name: { contains: ref, mode: 'insensitive' } }] },
  });
  if (!p) throw notFound(`Project "${ref}" not found`);
  return p;
};

export const updateProject = async (
  id: string,
  data: {
    name?: string;
    description?: string | null;
    briefing?: string | null;
    briefDocUrl?: string | null;
    amountRangeLow?: number;
    amountRangeHigh?: number;
    currency?: string;
  }
) => {
  const clean: Prisma.MscProjectUpdateInput = {};
  for (const k of ['name', 'description', 'briefing', 'briefDocUrl', 'amountRangeLow', 'amountRangeHigh', 'currency'] as const) {
    if (data[k] !== undefined) (clean as any)[k] = data[k];
  }
  await prisma.mscProject.update({ where: { id }, data: clean });
  return getProject(id);
};

export type TemplateInput = {
  name: string;
  order?: number;
  isFinal?: boolean;
  templateFileUrl?: string | null;
  deadlineOffsetDays?: number | null;
  paymentPercentage?: number;
  instructions?: string | null;
  requiredLinkTypes?: string[];
};

const templateData = (t: Partial<TemplateInput>) => {
  const d: any = {};
  for (const k of ['name', 'order', 'isFinal', 'templateFileUrl', 'deadlineOffsetDays', 'paymentPercentage', 'instructions'] as const) {
    if (t[k] !== undefined) d[k] = t[k];
  }
  if (t.requiredLinkTypes) d.requiredLinkTypes = t.requiredLinkTypes.map((x) => parseLinkType(x));
  return d;
};

/**
 * Add a submission template (stage) to a project. Existing students get a
 * PENDING submission for the new stage so every build stays in sync.
 */
export const addSubmissionTemplate = async (projectId: string, t: TemplateInput) => {
  if (!t.name) throw badRequest('Template name is required');
  const project = await prisma.mscProject.findUnique({
    where: { id: projectId },
    include: { submissionTemplates: true, students: { select: { id: true, createdAt: true } } },
  });
  if (!project) throw notFound('Project not found');

  const order = t.order ?? Math.max(0, ...project.submissionTemplates.map((s) => s.order)) + 1;
  if (project.submissionTemplates.some((s) => s.order === order)) {
    throw badRequest(`A stage with order ${order} already exists`);
  }

  const template = await prisma.submissionTemplate.create({
    data: {
      ...templateData(t),
      order,
      paymentPercentage: t.paymentPercentage ?? 0,
      deadlineOffsetDays: t.deadlineOffsetDays ?? 14,
      mscProjectId: projectId,
    },
  });

  if (project.students.length) {
    await prisma.submission.createMany({
      data: project.students.map((s) => ({
        studentId: s.id,
        submissionTemplateId: template.id,
        deadline: new Date(s.createdAt.getTime() + (template.deadlineOffsetDays ?? 14) * DAY),
      })),
      skipDuplicates: true,
    });
  }
  return template;
};

export const updateSubmissionTemplate = (id: string, t: Partial<TemplateInput>) =>
  prisma.submissionTemplate.update({ where: { id }, data: templateData(t) });

export const deleteSubmissionTemplate = async (id: string) => {
  const used = await prisma.submission.count({
    where: { submissionTemplateId: id, OR: [{ status: { not: SubmissionStatus.PENDING } }, { links: { some: {} } }] },
  });
  if (used) throw badRequest('This stage already has work recorded for some students; it cannot be deleted.');
  await prisma.$transaction([
    prisma.submission.deleteMany({ where: { submissionTemplateId: id } }),
    prisma.submissionTemplate.delete({ where: { id } }),
  ]);
  return { deleted: true };
};

export type TaskTemplateInput = {
  title: string;
  description?: string | null;
  order?: number;
  submissionTemplateId?: string | null;
};

export const addTaskTemplate = async (projectId: string, t: TaskTemplateInput, applyToExisting = false) => {
  if (!t.title) throw badRequest('Task title is required');
  const count = await prisma.projectTaskTemplate.count({ where: { mscProjectId: projectId } });
  const tpl = await prisma.projectTaskTemplate.create({
    data: {
      mscProjectId: projectId,
      title: t.title,
      description: t.description || null,
      order: t.order ?? count + 1,
      submissionTemplateId: t.submissionTemplateId || null,
    },
  });
  if (applyToExisting) {
    const students = await prisma.student.findMany({
      where: { mscProjectId: projectId, status: { in: ['ACTIVE', 'ON_HOLD'] } },
      include: { submissions: true },
    });
    for (const s of students) {
      await prisma.task.create({
        data: {
          studentId: s.id,
          mscProjectId: projectId,
          title: tpl.title,
          description: tpl.description,
          order: tpl.order,
          submissionId: s.submissions.find((x) => x.submissionTemplateId === tpl.submissionTemplateId)?.id || null,
        },
      });
    }
  }
  return tpl;
};

export const updateTaskTemplate = (id: string, t: Partial<TaskTemplateInput>) =>
  prisma.projectTaskTemplate.update({
    where: { id },
    data: {
      ...(t.title !== undefined && { title: t.title }),
      ...(t.description !== undefined && { description: t.description }),
      ...(t.order !== undefined && { order: t.order }),
      ...(t.submissionTemplateId !== undefined && { submissionTemplateId: t.submissionTemplateId || null }),
    },
  });

export const deleteTaskTemplate = async (id: string) => {
  await prisma.projectTaskTemplate.delete({ where: { id } });
  return { deleted: true };
};

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

/**
 * Find a student enrollment by id, roll number or (partial, case-insensitive) name.
 * A person enrolled in several projects can be disambiguated as "Name @ Project".
 */
export const findStudent = async (ref: string) => {
  let nameRef = ref.trim();
  let projectFilter: Prisma.StudentWhereInput = {};
  const at = nameRef.lastIndexOf(' @ ');
  if (at > 0) {
    const projectRef = nameRef.slice(at + 3).trim();
    nameRef = nameRef.slice(0, at).trim();
    projectFilter = { mscProject: { OR: [{ id: projectRef }, { name: { contains: projectRef, mode: 'insensitive' } }] } };
  }
  const describe = (m: { name: string; rollNo: string; mscProject: { name: string } }) => `${m.name} @ ${m.mscProject.name}`;
  const include = { mscProject: { select: { name: true } } };

  const exact = await prisma.student.findMany({
    where: {
      ...projectFilter,
      OR: [{ id: nameRef }, { rollNo: { equals: nameRef, mode: 'insensitive' } }, { name: { equals: nameRef, mode: 'insensitive' } }],
    },
    include,
  });
  const pick = (list: typeof exact) => {
    if (list.length === 1) return list[0];
    if (list.length > 1) {
      throw badRequest(`"${ref}" matches several enrollments: ${list.map(describe).join('; ')}. Use "Name @ Project".`);
    }
    return null;
  };
  const one = pick(exact);
  if (one) return one;
  const partial = await prisma.student.findMany({
    where: { ...projectFilter, name: { contains: nameRef, mode: 'insensitive' } },
    include,
  });
  const p = pick(partial);
  if (p) return p;
  throw notFound(`Student "${ref}" not found`);
};

export type EnrollInput = {
  mscProjectId: string;
  /** Enroll an existing person (tag an existing student) instead of creating a new one. */
  personId?: string | null;
  name?: string;
  mobileNo?: string;
  rollNo?: string | null;
  projectTitle?: string | null;
  agreedAmount: number;
  email?: string | null;
  meetingDay?: string | null;
  advancePaid?: number;
  links?: LinkInput[];
  startDate?: string | Date;
};

/** Enroll a student: creates one submission per stage and copies the sprint checklist. */
export const enrollStudent = async (input: EnrollInput, adminId?: string | null) => {
  if (!input.mscProjectId) throw badRequest('mscProjectId is required');
  if (!input.personId && (!input.name || !input.mobileNo)) {
    throw badRequest('Choose an existing student, or give a name and mobile number for a new one');
  }
  if (input.agreedAmount === undefined || input.agreedAmount === null || isNaN(Number(input.agreedAmount))) {
    throw badRequest('agreedAmount is required');
  }

  const project = await prisma.mscProject.findUnique({
    where: { id: input.mscProjectId },
    include: {
      submissionTemplates: { orderBy: { order: 'asc' } },
      taskTemplates: { orderBy: { order: 'asc' } },
      deliverables: true,
    },
  });
  if (!project) throw notFound('Project not found');

  let person = input.personId ? await prisma.person.findUnique({ where: { id: input.personId } }) : null;
  if (input.personId && !person) throw notFound('Student (person) not found');
  if (person) {
    const already = await prisma.student.findFirst({ where: { mscProjectId: project.id, personId: person.id } });
    if (already) throw badRequest(`${person.name} is already enrolled in ${project.name}`);
  }

  const start = input.startDate ? new Date(input.startDate) : new Date();

  return prisma.$transaction(async (tx) => {
    if (!person) {
      person = await tx.person.create({
        data: { name: input.name!, mobileNo: input.mobileNo!, rollNo: input.rollNo || null, email: input.email || null },
      });
    }
    const student = await tx.student.create({
      data: {
        mscProjectId: project.id,
        personId: person.id,
        name: person.name,
        mobileNo: person.mobileNo,
        rollNo: person.rollNo || '',
        projectTitle: input.projectTitle || null,
        agreedAmount: Number(input.agreedAmount),
        email: person.email,
        meetingDay: input.meetingDay || null,
        links: { create: linkRows(input.links) },
      },
    });

    const subByTemplate = new Map<string, string>();
    for (const t of project.submissionTemplates) {
      const sub = await tx.submission.create({
        data: {
          studentId: student.id,
          submissionTemplateId: t.id,
          deadline: new Date(start.getTime() + (t.deadlineOffsetDays ?? 14) * DAY),
        },
      });
      subByTemplate.set(t.id, sub.id);
    }

    if (project.taskTemplates.length) {
      await tx.task.createMany({
        data: project.taskTemplates.map((tt) => ({
          studentId: student.id,
          mscProjectId: project.id,
          title: tt.title,
          description: tt.description,
          order: tt.order,
          submissionId: tt.submissionTemplateId ? subByTemplate.get(tt.submissionTemplateId) || null : null,
        })),
      });
    }

    // Existing project deliverables become planned deliveries for the new student
    if (project.deliverables.length) {
      await tx.delivery.createMany({
        data: project.deliverables.map((d) => ({
          studentId: student.id,
          projectDeliverableId: d.id,
          title: d.title,
          description: d.description,
          status: DeliveryStatus.PLANNED,
          scheduledFor: d.dueDate,
        })),
      });
    }

    if (input.advancePaid && Number(input.advancePaid) > 0) {
      await tx.payment.create({
        data: {
          studentId: student.id,
          amount: Number(input.advancePaid),
          status: 'RECEIVED',
          receivedAt: new Date(),
          recordedByAdminId: adminId || null,
          notes: 'Initial advance payment upon enrollment.',
        },
      });
    }
    return student;
  });
};

/** Full workspace view of one student build. */
export const getStudentWorkspace = async (id: string) => {
  const s = await prisma.student.findUnique({
    where: { id },
    include: {
      mscProject: { include: projectInclude },
      person: { include: { enrollments: { select: { id: true, mscProject: { select: { id: true, name: true } } } } } },
      links: { orderBy: { createdAt: 'asc' } },
      submissions: {
        orderBy: { submissionTemplate: { order: 'asc' } },
        include: {
          submissionTemplate: true,
          submittedByAdmin: { select: { id: true, name: true } },
          reviewedByAdmin: { select: { id: true, name: true } },
          links: { orderBy: { createdAt: 'asc' } },
          notes: { include: { admin: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        },
      },
      tasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], include: { assigneeAdmin: { select: { id: true, name: true } } } },
      deliveries: {
        orderBy: [{ sentAt: 'desc' }, { scheduledFor: 'asc' }, { createdAt: 'desc' }],
        include: { links: true, sentByAdmin: { select: { id: true, name: true } }, submission: { include: { submissionTemplate: { select: { name: true } } } } },
      },
      notes: {
        where: { submissionId: null },
        include: { admin: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      payments: { orderBy: { receivedAt: 'desc' } },
      outsourcings: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!s) throw notFound('Student not found');

  const agreed = Number(s.agreedAmount);
  const paid = s.payments.filter((p) => p.status === 'RECEIVED').reduce((a, p) => a + Number(p.amount), 0);
  const outsourcing = s.outsourcings.reduce((a, o) => a + Number(o.amount), 0);
  const doneTasks = s.tasks.filter((t) => t.status === 'DONE').length;
  const now = Date.now();

  return {
    ...s,
    submissions: s.submissions.map((sub) => {
      const have = new Set(sub.links.map((l) => l.type));
      return {
        ...sub,
        missingLinkTypes: sub.submissionTemplate.requiredLinkTypes.filter((t) => !have.has(t)),
        overdue: sub.status !== 'COMPLETED' && sub.deadline.getTime() < now,
      };
    }),
    summary: {
      agreedAmount: agreed,
      totalPaid: paid,
      outstandingBalance: agreed - paid,
      totalOutsourcing: outsourcing,
      margin: agreed - outsourcing,
      tasksDone: doneTasks,
      tasksTotal: s.tasks.length,
      stagesCompleted: s.submissions.filter((x) => x.status === 'COMPLETED').length,
      stagesTotal: s.submissions.length,
      currentStage: s.submissions.find((x) => x.status !== 'COMPLETED')?.submissionTemplate.name || 'All stages completed',
      deliveriesSent: s.deliveries.filter((d) => d.status !== 'PLANNED').length,
      deliveriesPlanned: s.deliveries.filter((d) => d.status === 'PLANNED').length,
    },
  };
};

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export const addLink = async (
  target: { studentId?: string; submissionId?: string; deliveryId?: string },
  link: LinkInput
) => {
  if (!link.url) throw badRequest('url is required');
  if (!target.studentId && !target.submissionId && !target.deliveryId) {
    throw badRequest('A link must belong to a student, submission or delivery');
  }
  return prisma.link.create({
    data: { ...target, url: link.url, type: parseLinkType(link.type, link.url), label: link.label || null },
  });
};

export const updateLink = (id: string, link: Partial<LinkInput>) =>
  prisma.link.update({
    where: { id },
    data: {
      ...(link.url !== undefined && { url: link.url }),
      ...(link.label !== undefined && { label: link.label }),
      ...(link.type !== undefined && { type: parseLinkType(link.type, link.url) }),
    },
  });

export const deleteLink = async (id: string) => {
  await prisma.link.delete({ where: { id } });
  return { deleted: true };
};

// ---------------------------------------------------------------------------
// Submission lifecycle
// ---------------------------------------------------------------------------

const submissionInclude = {
  submissionTemplate: true,
  student: { select: { id: true, name: true } },
  submittedByAdmin: { select: { id: true, name: true } },
  reviewedByAdmin: { select: { id: true, name: true } },
  links: true,
  notes: { include: { admin: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.SubmissionInclude;

/** Find the submission for a student's stage by stage name (partial) or order number. */
export const findSubmission = async (studentRef: string, stageRef: string) => {
  const student = await findStudent(studentRef);
  const subs = await prisma.submission.findMany({
    where: { studentId: student.id },
    include: { submissionTemplate: true },
    orderBy: { submissionTemplate: { order: 'asc' } },
  });
  const n = Number(stageRef);
  const match =
    subs.find((s) => s.id === stageRef) ||
    (!isNaN(n) ? subs.find((s) => s.submissionTemplate.order === n) : undefined) ||
    subs.find((s) => s.submissionTemplate.name.toLowerCase() === stageRef.toLowerCase()) ||
    subs.find((s) => s.submissionTemplate.name.toLowerCase().includes(stageRef.toLowerCase()));
  if (!match) {
    throw notFound(`Stage "${stageRef}" not found for ${student.name}. Stages: ${subs.map((s) => `${s.submissionTemplate.order}. ${s.submissionTemplate.name}`).join(', ')}`);
  }
  return match;
};

/** Attach work links to a stage and mark it SUBMITTED. */
export const submitWork = async (
  submissionId: string,
  opts: { links?: LinkInput[]; fileLink?: string; adminId?: string | null; deadline?: string | Date; note?: string }
) => {
  const links = [...(opts.links || [])];
  if (opts.fileLink) links.unshift({ url: opts.fileLink });
  const rows = linkRows(links);
  if (!rows.length) {
    const existing = await prisma.link.count({ where: { submissionId } });
    if (!existing) throw badRequest('Add at least one link (GitHub, Doc, PPT...) before submitting this stage');
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      ...(rows.length && { fileLink: rows[0].url }),
      status: SubmissionStatus.SUBMITTED,
      submittedByAdminId: opts.adminId || null,
      submittedAt: new Date(),
      ...(opts.deadline && { deadline: new Date(opts.deadline) }),
      links: { create: rows },
    },
  });
  if (opts.note && opts.adminId) {
    await prisma.note.create({ data: { submissionId, adminId: opts.adminId, content: opts.note } });
  }
  return prisma.submission.findUniqueOrThrow({ where: { id: submissionId }, include: submissionInclude });
};

export const reviewWork = async (
  submissionId: string,
  opts: { action: 'APPROVE' | 'REQUEST_CHANGES'; adminId?: string | null; notes?: string }
) => {
  if (!['APPROVE', 'REQUEST_CHANGES'].includes(opts.action)) {
    throw badRequest("action must be 'APPROVE' or 'REQUEST_CHANGES'");
  }
  const existing = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!existing) throw notFound('Submission not found');

  if (opts.adminId && existing.submittedByAdminId && opts.adminId === existing.submittedByAdminId) {
    if ((await prisma.admin.count()) > 1) {
      throw badRequest('Peer review required: a different admin must review work they did not submit.');
    }
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: opts.action === 'APPROVE' ? SubmissionStatus.APPROVED : SubmissionStatus.CHANGES_REQUESTED,
      reviewedByAdminId: opts.adminId || null,
      reviewedAt: new Date(),
    },
  });
  if (opts.notes && opts.adminId) {
    await prisma.note.create({
      data: { submissionId, adminId: opts.adminId, content: `[Review - ${opts.action}]: ${opts.notes}` },
    });
  }
  return prisma.submission.findUniqueOrThrow({ where: { id: submissionId }, include: submissionInclude });
};

export const setShared = async (submissionId: string, shared: boolean) => {
  const existing = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!existing) throw notFound('Submission not found');
  const status =
    shared && existing.status === SubmissionStatus.APPROVED ? SubmissionStatus.SHARED_WITH_STUDENT : existing.status;
  return prisma.submission.update({
    where: { id: submissionId },
    data: { sharedWithStudent: shared, sharedAt: shared ? new Date() : null, status },
    include: submissionInclude,
  });
};

export const recordFeedback = async (submissionId: string, feedback: string) => {
  if (!feedback) throw badRequest('feedback text is required');
  return prisma.submission.update({
    where: { id: submissionId },
    data: { studentFeedback: feedback, feedbackReceivedAt: new Date(), status: SubmissionStatus.FEEDBACK_RECEIVED },
    include: submissionInclude,
  });
};

export const setSubmissionStatus = async (submissionId: string, status: string, deadline?: string | Date) => {
  if (!status || !(Object.values(SubmissionStatus) as string[]).includes(status)) {
    throw badRequest(`status must be one of ${Object.values(SubmissionStatus).join(', ')}`);
  }
  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: status as SubmissionStatus, ...(deadline && { deadline: new Date(deadline) }) },
    include: submissionInclude,
  });

  if (status === SubmissionStatus.COMPLETED) {
    const remaining = await prisma.submission.count({
      where: { studentId: updated.studentId, status: { not: SubmissionStatus.COMPLETED } },
    });
    if (updated.submissionTemplate.isFinal || remaining === 0) {
      await prisma.student.update({ where: { id: updated.studentId }, data: { status: 'COMPLETED' } });
    }
  }
  return updated;
};

export const setSubmissionDeadline = (submissionId: string, deadline: string | Date) =>
  prisma.submission.update({ where: { id: submissionId }, data: { deadline: new Date(deadline) }, include: submissionInclude });

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const addNote = async (
  target: { studentId?: string; submissionId?: string },
  content: string,
  adminId?: string | null
) => {
  if (!content) throw badRequest('Note content is required');
  if (!adminId) throw badRequest('An admin is required to add a note');
  if (!target.studentId && !target.submissionId) throw badRequest('A note must belong to a student or submission');
  return prisma.note.create({
    data: { ...target, content, adminId },
    include: { admin: { select: { id: true, name: true } } },
  });
};

export const deleteNote = async (id: string) => {
  await prisma.note.delete({ where: { id } });
  return { deleted: true };
};

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------

export type DeliveryInput = {
  studentId: string;
  title: string;
  description?: string | null;
  submissionId?: string | null;
  channel?: string | null;
  status?: string;
  scheduledFor?: string | Date | null;
  sentAt?: string | Date | null;
  links?: LinkInput[];
};

const parseDeliveryStatus = (s?: string) => {
  if (!s) return undefined;
  const up = s.toUpperCase();
  if (!(Object.values(DeliveryStatus) as string[]).includes(up)) {
    throw badRequest(`Delivery status must be one of ${Object.values(DeliveryStatus).join(', ')}`);
  }
  return up as DeliveryStatus;
};

const deliveryInclude = {
  links: true,
  sentByAdmin: { select: { id: true, name: true } },
  student: { select: { id: true, name: true } },
  submission: { include: { submissionTemplate: { select: { name: true } } } },
} satisfies Prisma.DeliveryInclude;

/** Log something sent to a student (or plan a future send with status PLANNED). */
export const createDelivery = async (input: DeliveryInput, adminId?: string | null) => {
  if (!input.studentId) throw badRequest('studentId is required');
  if (!input.title) throw badRequest('title is required');
  const status = parseDeliveryStatus(input.status) || (input.scheduledFor && !input.sentAt ? DeliveryStatus.PLANNED : DeliveryStatus.SENT);
  return prisma.delivery.create({
    data: {
      studentId: input.studentId,
      submissionId: input.submissionId || null,
      title: input.title,
      description: input.description || null,
      channel: input.channel || null,
      status,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      sentAt: status === DeliveryStatus.PLANNED ? null : input.sentAt ? new Date(input.sentAt) : new Date(),
      sentByAdminId: status === DeliveryStatus.PLANNED ? null : adminId || null,
      links: { create: linkRows(input.links) },
    },
    include: deliveryInclude,
  });
};

export const updateDelivery = async (id: string, input: Partial<DeliveryInput>, adminId?: string | null) => {
  const existing = await prisma.delivery.findUnique({ where: { id } });
  if (!existing) throw notFound('Delivery not found');
  const status = parseDeliveryStatus(input.status);
  const data: Prisma.DeliveryUncheckedUpdateInput = {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.channel !== undefined && { channel: input.channel }),
    ...(input.submissionId !== undefined && { submissionId: input.submissionId || null }),
    ...(input.scheduledFor !== undefined && { scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null }),
  };
  if (status) {
    data.status = status;
    if (status !== DeliveryStatus.PLANNED && !existing.sentAt) {
      data.sentAt = input.sentAt ? new Date(input.sentAt) : new Date();
      data.sentByAdminId = adminId || existing.sentByAdminId;
    }
    if (status === DeliveryStatus.ACKNOWLEDGED) data.acknowledgedAt = new Date();
    if (status === DeliveryStatus.PLANNED) {
      data.sentAt = null;
      data.acknowledgedAt = null;
    }
  }
  if (input.links?.length) data.links = { create: linkRows(input.links) };
  return prisma.delivery.update({ where: { id }, data, include: deliveryInclude });
};

export const deleteDelivery = async (id: string) => {
  await prisma.delivery.delete({ where: { id } });
  return { deleted: true };
};

export const listDeliveries = (filter: { studentId?: string; status?: string; mscProjectId?: string }) =>
  prisma.delivery.findMany({
    where: {
      ...(filter.studentId && { studentId: filter.studentId }),
      ...(filter.status && { status: parseDeliveryStatus(filter.status) }),
      ...(filter.mscProjectId && { student: { mscProjectId: filter.mscProjectId } }),
    },
    include: deliveryInclude,
    orderBy: [{ scheduledFor: 'asc' }, { sentAt: 'desc' }],
  });

// ---------------------------------------------------------------------------
// Tasks (sprint checklist)
// ---------------------------------------------------------------------------

export type TaskInput = {
  studentId?: string | null;
  mscProjectId?: string | null;
  title: string;
  description?: string | null;
  submissionId?: string | null;
  status?: string;
  order?: number;
  dueDate?: string | Date | null;
  assigneeAdminId?: string | null;
};

const parseTaskStatus = (s?: string) => {
  if (!s) return undefined;
  const up = s.toUpperCase().replace(/[\s-]/g, '_');
  if (!(Object.values(TaskStatus) as string[]).includes(up)) {
    throw badRequest(`Task status must be one of ${Object.values(TaskStatus).join(', ')}`);
  }
  return up as TaskStatus;
};

export const createTask = async (input: TaskInput) => {
  if (!input.title) throw badRequest('title is required');
  let mscProjectId = input.mscProjectId || null;
  if (input.studentId) {
    const st = await prisma.student.findUnique({ where: { id: input.studentId } });
    if (!st) throw notFound('Student not found');
    mscProjectId = st.mscProjectId;
  }
  const count = await prisma.task.count({ where: input.studentId ? { studentId: input.studentId } : { studentId: null } });
  const status = parseTaskStatus(input.status) || TaskStatus.TODO;
  return prisma.task.create({
    data: {
      studentId: input.studentId || null,
      mscProjectId,
      title: input.title,
      description: input.description || null,
      submissionId: input.submissionId || null,
      status,
      order: input.order ?? count + 1,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigneeAdminId: input.assigneeAdminId || null,
      completedAt: status === TaskStatus.DONE ? new Date() : null,
    },
  });
};

export const updateTask = async (id: string, input: Partial<TaskInput>) => {
  const status = parseTaskStatus(input.status);
  return prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.submissionId !== undefined && { submissionId: input.submissionId || null }),
      ...(input.order !== undefined && { order: input.order }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate ? new Date(input.dueDate) : null }),
      ...(input.assigneeAdminId !== undefined && { assigneeAdminId: input.assigneeAdminId || null }),
      ...(input.mscProjectId !== undefined && !input.studentId && { mscProjectId: input.mscProjectId || null }),
      ...(status && { status, completedAt: status === TaskStatus.DONE ? new Date() : null }),
    },
  });
};

export const deleteTask = async (id: string) => {
  await prisma.task.delete({ where: { id } });
  return { deleted: true };
};

/** Find a student's task by id or (partial) title. */
export const findTask = async (studentId: string, ref: string) => {
  const tasks = await prisma.task.findMany({ where: { studentId } });
  const t =
    tasks.find((x) => x.id === ref) ||
    tasks.find((x) => x.title.toLowerCase() === ref.toLowerCase()) ||
    tasks.find((x) => x.title.toLowerCase().includes(ref.toLowerCase()));
  if (!t) throw notFound(`Task "${ref}" not found. Tasks: ${tasks.map((x) => x.title).join(', ') || 'none'}`);
  return t;
};

// ---------------------------------------------------------------------------
// Agenda: what needs attention
// ---------------------------------------------------------------------------

export const getAgenda = async (days = 14, mscProjectId?: string) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * DAY);
  const studentWhere = { status: { in: ['ACTIVE', 'ON_HOLD'] as any }, ...(mscProjectId && { mscProjectId }) };

  const [overdueStages, upcomingStages, awaitingReview, plannedDeliveries, openTasks] = await Promise.all([
    prisma.submission.findMany({
      where: { deadline: { lt: now }, status: { not: 'COMPLETED' }, student: studentWhere },
      include: { student: { select: { id: true, name: true } }, submissionTemplate: { select: { name: true } } },
      orderBy: { deadline: 'asc' },
    }),
    prisma.submission.findMany({
      where: { deadline: { gte: now, lte: horizon }, status: { not: 'COMPLETED' }, student: studentWhere },
      include: { student: { select: { id: true, name: true } }, submissionTemplate: { select: { name: true } } },
      orderBy: { deadline: 'asc' },
    }),
    prisma.submission.findMany({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] }, student: studentWhere },
      include: {
        student: { select: { id: true, name: true } },
        submissionTemplate: { select: { name: true } },
        submittedByAdmin: { select: { name: true } },
      },
    }),
    prisma.delivery.findMany({
      where: { status: 'PLANNED', student: studentWhere, OR: [{ scheduledFor: null }, { scheduledFor: { lte: horizon } }] },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { scheduledFor: 'asc' },
    }),
    prisma.task.findMany({
      where: { status: { not: 'DONE' }, student: studentWhere, OR: [{ dueDate: null }, { dueDate: { lte: horizon } }] },
      include: { student: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: 'asc' }, { order: 'asc' }],
    }),
  ]);

  const stage = (s: (typeof overdueStages)[number]) => ({
    submissionId: s.id,
    student: s.student.name,
    studentId: s.student.id,
    stage: s.submissionTemplate.name,
    status: s.status,
    deadline: s.deadline,
  });

  return {
    generatedAt: now,
    horizonDays: days,
    overdueStages: overdueStages.map(stage),
    upcomingStages: upcomingStages.map(stage),
    awaitingReview: awaitingReview.map((s) => ({ ...stage(s), submittedBy: s.submittedByAdmin?.name || null })),
    plannedDeliveries: plannedDeliveries.map((d) => ({
      deliveryId: d.id,
      student: d.student.name,
      studentId: d.student.id,
      title: d.title,
      scheduledFor: d.scheduledFor,
      overdue: !!d.scheduledFor && d.scheduledFor < now,
    })),
    openTasks: openTasks.map((t) => ({
      taskId: t.id,
      student: t.student?.name || 'General',
      studentId: t.student?.id || null,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      overdue: !!t.dueDate && t.dueDate < now,
    })),
  };
};
