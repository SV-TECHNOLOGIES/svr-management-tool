import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { HttpError } from '../services/errors';
import * as ws from '../services/workspace.service';
import * as biz from '../services/business.service';

/**
 * MCP tools for managing the project portal from Claude (or any MCP client).
 * Students, stages, tasks and admins can be referenced by name — no IDs needed.
 */

export type McpContext = {
  /** Admin the tools act as (notes, submissions, deliveries). */
  defaultAdminId?: string | null;
};

const json = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

const fail = (error: unknown) => {
  const msg =
    error instanceof HttpError
      ? error.message
      : (error as { code?: string })?.code === 'P2025'
        ? 'Record not found'
        : `Unexpected error: ${(error as Error)?.message || String(error)}`;
  return { content: [{ type: 'text' as const, text: msg }], isError: true };
};

/** Enum that accepts any casing / spaces / dashes, e.g. "in progress" -> IN_PROGRESS. */
const ciEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/[\s-]+/g, '_') : v),
    z.enum(values as unknown as [T[number], ...T[number][]])
  );

const linkSchema = z.object({
  url: z.string().describe('URL or file name'),
  type: z
    .enum(['GITHUB', 'GOOGLE_DOC', 'PPT', 'COLAB', 'DATASET', 'DRIVE', 'REPORT', 'OTHER'])
    .optional()
    .describe('Link type; guessed from the URL when omitted'),
  label: z.string().optional(),
});

const asAdmin = z
  .string()
  .optional()
  .describe('Admin name or email to act as (defaults to the configured MCP admin)');

/** Compact student summary for list views. */
const studentRow = async (studentId: string) => {
  const w = await ws.getStudentWorkspace(studentId);
  return {
    id: w.id,
    name: w.name,
    rollNo: w.rollNo,
    projectTitle: w.projectTitle,
    status: w.status,
    project: w.mscProject.name,
    currentStage: w.summary.currentStage,
    stages: `${w.summary.stagesCompleted}/${w.summary.stagesTotal}`,
    tasks: `${w.summary.tasksDone}/${w.summary.tasksTotal}`,
    outstanding: w.summary.outstandingBalance,
  };
};

const workspaceView = (w: Awaited<ReturnType<typeof ws.getStudentWorkspace>>) => ({
  id: w.id,
  name: w.name,
  rollNo: w.rollNo,
  mobileNo: w.mobileNo,
  email: w.email,
  meetingDay: w.meetingDay,
  projectTitle: w.projectTitle,
  status: w.status,
  project: { id: w.mscProject.id, name: w.mscProject.name, briefDocUrl: w.mscProject.briefDocUrl },
  summary: w.summary,
  links: w.links.map((l) => ({ id: l.id, type: l.type, label: l.label, url: l.url })),
  stages: w.submissions.map((s) => ({
    submissionId: s.id,
    order: s.submissionTemplate.order,
    stage: s.submissionTemplate.name,
    status: s.status,
    deadline: s.deadline,
    overdue: s.overdue,
    links: s.links.map((l) => ({ id: l.id, type: l.type, label: l.label, url: l.url })),
    missingLinkTypes: s.missingLinkTypes,
    submittedBy: s.submittedByAdmin?.name || null,
    reviewedBy: s.reviewedByAdmin?.name || null,
    sharedWithStudent: s.sharedWithStudent,
    studentFeedback: s.studentFeedback,
    notes: s.notes.slice(0, 5).map((n) => ({ id: n.id, by: n.admin.name, at: n.createdAt, content: n.content })),
  })),
  tasks: w.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate, assignee: t.assigneeAdmin?.name || null })),
  deliveries: w.deliveries.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    channel: d.channel,
    scheduledFor: d.scheduledFor,
    sentAt: d.sentAt,
    stage: d.submission?.submissionTemplate.name || null,
    links: d.links.map((l) => ({ type: l.type, url: l.url })),
  })),
  notes: w.notes.slice(0, 10).map((n) => ({ id: n.id, by: n.admin.name, at: n.createdAt, content: n.content })),
  payments: w.payments.map((p) => ({ id: p.id, amount: Number(p.amount), status: p.status, receivedAt: p.receivedAt, notes: p.notes })),
});

export const createMcpServer = (ctx: McpContext = {}) => {
  const server = new McpServer({ name: 'project-portal', version: '1.0.0' });

  const admin = async (ref?: string) => {
    if (ref) return ws.resolveAdminId(ref);
    if (ctx.defaultAdminId) return ctx.defaultAdminId;
    const envRef = process.env.MCP_ADMIN_EMAIL;
    if (envRef) return ws.resolveAdminId(envRef);
    const first = await prisma.admin.findFirst({ orderBy: { createdAt: 'asc' } });
    return first?.id || null;
  };

  const tool = <S extends z.ZodRawShape>(
    name: string,
    description: string,
    shape: S,
    run: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>,
    mode: boolean | 'read' | 'write' | 'destructive' = 'write'
  ) =>
    // cast avoids TS2589 (deep generic instantiation) in the SDK's typings; args are validated by zod at runtime
    (server as any).registerTool(
      name,
      {
        description,
        inputSchema: shape,
        annotations: {
          readOnlyHint: mode === true || mode === 'read',
          destructiveHint: mode === 'destructive',
        },
      },
      (async (args: any) => {
        try {
          return json(await run(args));
        } catch (e) {
          return fail(e);
        }
      }) as any
    );

  // ---------------------------------------------------------------- overview
  tool(
    'get_agenda',
    'What needs attention: overdue and upcoming stage deadlines, work awaiting peer review, planned deliveries to send, and open sprint tasks.',
    {
      days: z.number().int().min(1).max(120).optional().describe('Look-ahead window in days (default 14)'),
      project: z.string().optional().describe('Limit to one project (name or id)'),
    },
    async ({ days, project }) => ws.getAgenda(days ?? 14, project ? (await ws.findProject(project)).id : undefined),
    true
  );

  tool(
    'list_admins',
    'List the admin users (for acting-as and peer review).',
    {},
    () => prisma.admin.findMany({ select: { id: true, name: true, email: true, role: true } }),
    true
  );

  // ---------------------------------------------------------------- projects
  tool(
    'list_projects',
    'List projects with student counts and their submission stages.',
    {},
    async () => {
      const ps = await prisma.mscProject.findMany({
        include: { submissionTemplates: { orderBy: { order: 'asc' } }, _count: { select: { students: true, taskTemplates: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return ps.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        briefDocUrl: p.briefDocUrl,
        students: p._count.students,
        checklistItems: p._count.taskTemplates,
        stages: p.submissionTemplates.map((t) => `${t.order}. ${t.name}`),
      }));
    },
    true
  );

  tool(
    'get_project',
    'Get a project: briefing, brief document, submission stages (what must be submitted), default sprint checklist and students.',
    { project: z.string().describe('Project name or id') },
    async ({ project }) => ws.getProject((await ws.findProject(project)).id),
    true
  );

  tool(
    'create_project',
    'Create a project with its shared brief, submission stages (templates) and default sprint checklist copied to every student.',
    {
      name: z.string(),
      description: z.string().optional(),
      briefing: z.string().optional().describe('Shared brief / task description all student builds follow'),
      briefDocUrl: z.string().optional().describe('Link to the briefing / task document'),
      amountRangeLow: z.number().default(0),
      amountRangeHigh: z.number().default(0),
      currency: z.string().default('GBP'),
      stages: z
        .array(
          z.object({
            name: z.string(),
            deadlineOffsetDays: z.number().int().optional().describe('Days after enrollment'),
            paymentPercentage: z.number().optional(),
            templateFileUrl: z.string().optional(),
            instructions: z.string().optional(),
            requiredLinkTypes: z.array(linkSchema.shape.type.unwrap()).optional(),
            isFinal: z.boolean().optional(),
          })
        )
        .default([]),
      checklist: z
        .array(z.object({ title: z.string(), description: z.string().optional(), stageOrder: z.number().int().optional() }))
        .default([]),
    },
    async (a) => {
      const project = await prisma.mscProject.create({
        data: {
          name: a.name,
          description: a.description,
          briefing: a.briefing,
          briefDocUrl: a.briefDocUrl,
          amountRangeLow: a.amountRangeLow,
          amountRangeHigh: a.amountRangeHigh,
          currency: a.currency,
        },
      });
      // Payment % not given -> split 100% evenly across the stages (remainder on the last)
      const n = a.stages.length;
      const given = a.stages.some((st) => st.paymentPercentage !== undefined);
      const base = n ? Math.floor(100 / n) : 0;
      for (const [i, s] of a.stages.entries()) {
        await ws.addSubmissionTemplate(project.id, {
          ...s,
          order: i + 1,
          isFinal: s.isFinal ?? i === n - 1,
          paymentPercentage: given ? s.paymentPercentage ?? 0 : i === n - 1 ? 100 - base * (n - 1) : base,
        });
      }
      const stages = await prisma.submissionTemplate.findMany({ where: { mscProjectId: project.id } });
      for (const c of a.checklist) {
        await ws.addTaskTemplate(project.id, {
          title: c.title,
          description: c.description,
          submissionTemplateId: c.stageOrder ? stages.find((s) => s.order === c.stageOrder)?.id : null,
        });
      }
      return ws.getProject(project.id);
    }
  );

  tool(
    'update_project',
    'Update a project brief, brief document link, description or pricing.',
    {
      project: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      briefing: z.string().optional(),
      briefDocUrl: z.string().optional(),
      amountRangeLow: z.number().optional(),
      amountRangeHigh: z.number().optional(),
    },
    async ({ project, ...rest }) => ws.updateProject((await ws.findProject(project)).id, rest)
  );

  tool(
    'add_stage',
    'Add a submission stage (template) to a project, e.g. "Midpoint PPT". Existing students automatically get it as PENDING.',
    {
      project: z.string(),
      name: z.string(),
      order: z.number().int().optional(),
      deadlineOffsetDays: z.number().int().optional(),
      paymentPercentage: z.number().optional(),
      templateFileUrl: z.string().optional(),
      instructions: z.string().optional(),
      requiredLinkTypes: z.array(linkSchema.shape.type.unwrap()).optional(),
      isFinal: z.boolean().optional(),
    },
    async ({ project, ...t }) => ws.addSubmissionTemplate((await ws.findProject(project)).id, t)
  );

  tool(
    'update_stage',
    'Update a submission stage template (name, template file, instructions, required links, offset, payment %).',
    {
      project: z.string(),
      stage: z.string().describe('Stage name or order number'),
      name: z.string().optional(),
      templateFileUrl: z.string().optional(),
      instructions: z.string().optional(),
      deadlineOffsetDays: z.number().int().optional(),
      paymentPercentage: z.number().optional(),
      requiredLinkTypes: z.array(linkSchema.shape.type.unwrap()).optional(),
      isFinal: z.boolean().optional(),
    },
    async ({ project, stage, ...t }) => {
      const p = await ws.getProject((await ws.findProject(project)).id);
      const n = Number(stage);
      const tpl =
        p.submissionTemplates.find((s) => (!isNaN(n) && s.order === n) || s.id === stage) ||
        p.submissionTemplates.find((s) => s.name.toLowerCase().includes(stage.toLowerCase()));
      if (!tpl) throw new HttpError(404, `Stage "${stage}" not found`);
      return ws.updateSubmissionTemplate(tpl.id, t);
    }
  );

  tool(
    'add_checklist_item',
    'Add an item to a project default sprint checklist. Optionally also add it as a task to all active students.',
    {
      project: z.string(),
      title: z.string(),
      description: z.string().optional(),
      stageOrder: z.number().int().optional().describe('Stage the task belongs to'),
      applyToExisting: z.boolean().default(false),
    },
    async ({ project, title, description, stageOrder, applyToExisting }) => {
      const p = await ws.getProject((await ws.findProject(project)).id);
      const st = stageOrder ? p.submissionTemplates.find((s) => s.order === stageOrder) : undefined;
      return ws.addTaskTemplate(p.id, { title, description, submissionTemplateId: st?.id }, applyToExisting);
    }
  );

  // ---------------------------------------------------------------- students
  tool(
    'list_students',
    'List students with current stage, stage/task progress and outstanding balance.',
    {
      project: z.string().optional(),
      status: ciEnum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'DROPPED']).optional(),
    },
    async ({ project, status }) => {
      const students = await prisma.student.findMany({
        where: {
          ...(project && { mscProjectId: (await ws.findProject(project)).id }),
          ...(status && { status }),
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      return Promise.all(students.map((s) => studentRow(s.id)));
    },
    true
  );

  tool(
    'get_student',
    'Full workspace for one student build: links, every stage (status, links, missing required links, notes), sprint tasks, deliveries sent/planned, payments summary.',
    { student: z.string().describe('Student name (partial ok), roll number or id') },
    async ({ student }) => workspaceView(await ws.getStudentWorkspace((await ws.findStudent(student)).id)),
    true
  );

  tool(
    'list_people',
    'List students as people, with every project each one is enrolled in. Use before enrolling to tag an existing student.',
    { search: z.string().optional() },
    async ({ search }) => biz.listPeople(search),
    true
  );

  /** Resolve an existing person by name / roll no / mobile / id (any project). */
  const findPerson = async (ref: string) => {
    const byEnrollment = await ws.findStudent(ref).catch(() => null);
    if (byEnrollment) return { id: byEnrollment.personId, name: byEnrollment.name };
    const people = await biz.listPeople(ref);
    const exact = people.filter((p) => p.id === ref || p.name.toLowerCase() === ref.toLowerCase());
    const pick = exact.length === 1 ? exact : people;
    if (pick.length === 1) return { id: pick[0].id, name: pick[0].name };
    if (!pick.length) throw new HttpError(404, `No student matches "${ref}"`);
    throw new HttpError(400, `"${ref}" matches several students: ${pick.map((p) => p.name).join(', ')}`);
  };

  tool(
    'enroll_student',
    'Enroll students in a project. Existing students: give existingStudents (one or many names / roll nos; they keep their contact details). New student: give name + mobileNo. agreedAmount defaults to the amount of the last student enrolled in the project. Creates stage submissions, sprint tasks and planned deliveries for the project deliverables.',
    {
      project: z.string(),
      existingStudents: z.array(z.string()).optional().describe('Names / roll nos of students already in the system (any project)'),
      existingStudent: z.string().optional().describe('Single existing student (same as existingStudents with one name)'),
      name: z.string().optional().describe('New student name'),
      mobileNo: z.string().optional().describe('New student mobile number'),
      rollNo: z.string().optional(),
      email: z.string().optional(),
      projectTitle: z.string().optional().describe('Topic of this student build (optional)'),
      agreedAmount: z.number().optional().describe('Defaults to the last enrolled student amount in this project'),
      meetingDay: z.string().optional(),
      advancePaid: z.number().optional(),
      startDate: z.string().optional().describe('ISO date deadlines are calculated from (default today)'),
      links: z.array(linkSchema).optional(),
      asAdmin,
    },
    async ({ project, existingStudents, existingStudent, asAdmin: who, agreedAmount, ...rest }) => {
      const projectId = (await ws.findProject(project)).id;
      const adminId = await admin(who);
      const refs = [...(existingStudents || []), ...(existingStudent ? [existingStudent] : [])];
      if (refs.length) {
        const people = await Promise.all(refs.map(findPerson));
        return biz.enrollMany(projectId, people.map((p) => p.id), { agreedAmount, projectTitle: rest.projectTitle, advancePaid: rest.advancePaid }, adminId);
      }
      const amount = agreedAmount ?? (await biz.lastAgreedAmount(projectId));
      if (amount === null || amount === undefined) throw new HttpError(400, 'agreedAmount is required (no previous student in this project to copy it from)');
      const s = await ws.enrollStudent({ ...rest, agreedAmount: amount, mscProjectId: projectId }, adminId);
      return workspaceView(await ws.getStudentWorkspace(s.id));
    }
  );

  tool(
    'update_student',
    'Update a student enrollment (title, price, status ACTIVE / ON_HOLD / COMPLETED / DROPPED, meeting day) or contact details (name, mobile, roll no, email: applied to all their enrollments).',
    {
      student: z.string().describe('Name (or "Name @ Project"), roll no or id'),
      name: z.string().optional(),
      projectTitle: z.string().optional(),
      mobileNo: z.string().optional(),
      rollNo: z.string().optional(),
      email: z.string().optional(),
      meetingDay: z.string().optional(),
      agreedAmount: z.number().optional(),
      status: ciEnum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'DROPPED']).optional(),
    },
    async ({ student, ...data }) => biz.updateEnrollment((await ws.findStudent(student)).id, data)
  );

  tool(
    'add_student_link',
    'Attach a project-wide link to a student build (GitHub repo, Colab, dataset, shared Drive folder...).',
    { student: z.string(), ...linkSchema.shape },
    async ({ student, ...link }) => ws.addLink({ studentId: (await ws.findStudent(student)).id }, link)
  );

  // ---------------------------------------------------------------- stages / submissions
  tool(
    'submit_stage_work',
    'Attach work links (GitHub / Google Doc / PPT / Colab...) to a student stage and mark it SUBMITTED for peer review.',
    {
      student: z.string(),
      stage: z.string().describe('Stage name (partial ok) or order number'),
      links: z.array(linkSchema).min(1),
      note: z.string().optional(),
      asAdmin,
    },
    async ({ student, stage, links, note, asAdmin: who }) => {
      const sub = await ws.findSubmission(student, stage);
      return ws.submitWork(sub.id, { links, note, adminId: await admin(who) });
    }
  );

  tool(
    'add_stage_link',
    'Attach an extra link to a student stage without changing its status.',
    { student: z.string(), stage: z.string(), ...linkSchema.shape },
    async ({ student, stage, ...link }) => ws.addLink({ submissionId: (await ws.findSubmission(student, stage)).id }, link)
  );

  tool(
    'review_stage',
    'Peer-review a submitted stage: APPROVE or REQUEST_CHANGES (with notes). Reviewer must differ from the submitter.',
    {
      student: z.string(),
      stage: z.string(),
      action: ciEnum(['APPROVE', 'REQUEST_CHANGES']),
      notes: z.string().optional(),
      asAdmin,
    },
    async ({ student, stage, action, notes, asAdmin: who }) =>
      ws.reviewWork((await ws.findSubmission(student, stage)).id, { action, notes, adminId: await admin(who) })
  );

  tool(
    'share_stage_with_student',
    'Mark a stage as shared with the student (APPROVED → SHARED_WITH_STUDENT).',
    { student: z.string(), stage: z.string(), shared: z.boolean().default(true) },
    async ({ student, stage, shared }) => ws.setShared((await ws.findSubmission(student, stage)).id, shared)
  );

  tool(
    'record_student_feedback',
    'Record the feedback a student gave on a stage (→ FEEDBACK_RECEIVED).',
    { student: z.string(), stage: z.string(), feedback: z.string() },
    async ({ student, stage, feedback }) => ws.recordFeedback((await ws.findSubmission(student, stage)).id, feedback)
  );

  tool(
    'set_stage_status',
    'Set a stage status directly and/or move its deadline. COMPLETED on the final stage completes the student.',
    {
      student: z.string(),
      stage: z.string(),
      status: ciEnum(['PENDING', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SHARED_WITH_STUDENT', 'FEEDBACK_RECEIVED', 'COMPLETED'])
        .optional(),
      deadline: z.string().optional().describe('New deadline, ISO date'),
    },
    async ({ student, stage, status, deadline }) => {
      const sub = await ws.findSubmission(student, stage);
      if (status) return ws.setSubmissionStatus(sub.id, status, deadline);
      if (deadline) return ws.setSubmissionDeadline(sub.id, deadline);
      throw new HttpError(400, 'Provide status and/or deadline');
    }
  );

  // ---------------------------------------------------------------- notes
  tool(
    'add_note',
    'Add a timestamped note to a student (e.g. weekly meeting notes) or to one of their stages.',
    { student: z.string(), content: z.string(), stage: z.string().optional(), asAdmin },
    async ({ student, content, stage, asAdmin: who }) => {
      const adminId = await admin(who);
      if (stage) return ws.addNote({ submissionId: (await ws.findSubmission(student, stage)).id }, content, adminId);
      return ws.addNote({ studentId: (await ws.findStudent(student)).id }, content, adminId);
    }
  );

  // ---------------------------------------------------------------- deliveries
  tool(
    'log_delivery',
    'Record documents/results sent to a student (status SENT), or plan a future send (status PLANNED with scheduledFor).',
    {
      student: z.string(),
      title: z.string().describe('What was sent, e.g. "Week 3 results + updated notebook"'),
      description: z.string().optional(),
      links: z.array(linkSchema).optional(),
      stage: z.string().optional().describe('Stage this delivery relates to'),
      channel: z.string().optional().describe('WhatsApp, Email, Drive...'),
      status: ciEnum(['PLANNED', 'SENT', 'ACKNOWLEDGED']).optional(),
      scheduledFor: z.string().optional().describe('ISO date for a planned delivery'),
      asAdmin,
    },
    async ({ student, stage, asAdmin: who, ...rest }) => {
      const s = await ws.findStudent(student);
      const submissionId = stage ? (await ws.findSubmission(s.id, stage)).id : null;
      return ws.createDelivery({ ...rest, studentId: s.id, submissionId }, await admin(who));
    }
  );

  tool(
    'update_delivery',
    'Update a delivery, e.g. mark a PLANNED delivery as SENT or a sent one as ACKNOWLEDGED, or add links.',
    {
      deliveryId: z.string(),
      status: ciEnum(['PLANNED', 'SENT', 'ACKNOWLEDGED']).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      scheduledFor: z.string().optional(),
      links: z.array(linkSchema).optional(),
      asAdmin,
    },
    async ({ deliveryId, asAdmin: who, ...rest }) => ws.updateDelivery(deliveryId, rest, await admin(who))
  );

  tool(
    'list_deliveries',
    'List deliveries, optionally for one student or by status.',
    { student: z.string().optional(), status: ciEnum(['PLANNED', 'SENT', 'ACKNOWLEDGED']).optional() },
    async ({ student, status }) =>
      ws.listDeliveries({ studentId: student ? (await ws.findStudent(student)).id : undefined, status }),
    true
  );

  // ---------------------------------------------------------------- tasks
  tool(
    'add_task',
    'Add a task: to one student build (student), or a general work item on the my-work board (no student, optionally a project).',
    {
      title: z.string(),
      student: z.string().optional(),
      project: z.string().optional().describe('For general tasks not tied to a student'),
      description: z.string().optional(),
      stage: z.string().optional(),
      dueDate: z.string().optional(),
      status: ciEnum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
      assignTo: z.string().optional().describe('Admin name or email'),
    },
    async ({ student, project, stage, assignTo, ...rest }) => {
      const assigneeAdminId = assignTo ? await ws.resolveAdminId(assignTo) : null;
      if (student) {
        const s = await ws.findStudent(student);
        const submissionId = stage ? (await ws.findSubmission(s.id, stage)).id : null;
        return ws.createTask({ ...rest, studentId: s.id, submissionId, assigneeAdminId });
      }
      const mscProjectId = project ? (await ws.findProject(project)).id : null;
      return ws.createTask({ ...rest, mscProjectId, assigneeAdminId });
    }
  );

  tool(
    'get_my_work',
    'My work board: my tasks (assigned to me or unassigned), stages I can review, my submissions waiting on others, deliveries to send, deadlines this week, unpaid vendor expenses.',
    { scope: ciEnum(['MINE', 'ALL']).optional(), asAdmin },
    async ({ scope, asAdmin: who }) => {
      const id = await admin(who);
      if (!id) throw new HttpError(400, 'No admin to show work for');
      return biz.getMyWork(id, { scope: scope === 'ALL' ? 'all' : 'mine' });
    },
    true
  );

  // ---------------------------------------------------------------- project deliverables
  tool(
    'add_project_deliverable',
    'Define a deliverable for a whole project (e.g. "Week 3 results pack"). Every active student gets a PLANNED delivery so you can track who has received it.',
    {
      project: z.string(),
      title: z.string(),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      links: z.array(linkSchema).optional(),
      asAdmin,
    },
    async ({ project, asAdmin: who, ...rest }) =>
      biz.createProjectDeliverable((await ws.findProject(project)).id, rest, await admin(who))
  );

  tool(
    'list_project_deliverables',
    'Project deliverables with delivered X / Y and, per student, whether it was sent.',
    { project: z.string() },
    async ({ project }) => biz.listProjectDeliverables((await ws.findProject(project)).id),
    true
  );

  tool(
    'mark_deliverable_sent',
    'Mark a project deliverable as sent to some students (names) or to everyone still pending.',
    {
      project: z.string(),
      deliverable: z.string().describe('Deliverable title (partial ok) or id'),
      students: z.array(z.string()).optional().describe('Omit to mark all remaining students'),
      channel: z.string().optional(),
      links: z.array(linkSchema).optional(),
      asAdmin,
    },
    async ({ project, deliverable, students, channel, links, asAdmin: who }) => {
      const projectId = (await ws.findProject(project)).id;
      const all = await biz.listProjectDeliverables(projectId);
      const d =
        all.find((x) => x.id === deliverable) || all.find((x) => x.title.toLowerCase().includes(deliverable.toLowerCase()));
      if (!d) throw new HttpError(404, `Deliverable "${deliverable}" not found. Deliverables: ${all.map((x) => x.title).join(', ') || 'none'}`);
      const studentIds = students?.length
        ? await Promise.all(students.map(async (n) => (await ws.findStudent(`${n} @ ${projectId}`)).id))
        : undefined;
      return biz.markDeliverableSent(d.id, { studentIds, channel, links }, await admin(who));
    }
  );

  // ---------------------------------------------------------------- expenses / outsourcing
  tool(
    'log_expense',
    'Log an outsourcing expense for a project: whole project, one student, or several students (one row per student). With students, amount is per student unless amountMode is SPLIT (amount is the total, divided equally).',
    {
      project: z.string(),
      paidTo: z.string().describe('Vendor / freelancer'),
      amount: z.number().positive(),
      description: z.string().optional(),
      student: z.string().optional(),
      students: z.array(z.string()).optional().describe('Several student names; creates one expense per student'),
      amountMode: ciEnum(['PER_STUDENT', 'SPLIT']).optional(),
      status: ciEnum(['UNPAID', 'PAID']).optional(),
      notes: z.string().optional(),
      asAdmin,
    },
    async ({ project, student, students, amountMode, asAdmin: who, ...rest }) => {
      const mscProjectId = (await ws.findProject(project)).id;
      if (students?.length) {
        const studentIds = await Promise.all(students.map(async (s) => (await ws.findStudent(`${s} @ ${mscProjectId}`)).id));
        return biz.createExpensesForStudents({ ...rest, mscProjectId, studentIds, amountMode: amountMode as any }, await admin(who));
      }
      const studentId = student ? (await ws.findStudent(`${student} @ ${mscProjectId}`)).id : null;
      return biz.createExpense({ ...rest, mscProjectId, studentId }, await admin(who));
    }
  );

  tool(
    'mark_expense_paid',
    'Mark outsourcing expenses as PAID (or back to UNPAID). Give an expense id, or a vendor name to settle all of their unpaid expenses (optionally within one project).',
    {
      expenseId: z.string().optional(),
      paidTo: z.string().optional(),
      project: z.string().optional(),
      status: ciEnum(['PAID', 'UNPAID']).default('PAID'),
    },
    async ({ expenseId, paidTo, project, status }) => {
      if (expenseId) return biz.updateExpense(expenseId, { status });
      if (!paidTo) throw new HttpError(400, 'Give expenseId or paidTo');
      const list = await biz.listExpenses({
        paidTo,
        mscProjectId: project ? (await ws.findProject(project)).id : undefined,
        status: status === 'PAID' ? 'UNPAID' : 'PAID',
      });
      for (const e of list.expenses) await biz.updateExpense(e.id, { status });
      return { updated: list.expenses.length, amount: list.totalOutsourcing };
    }
  );

  tool(
    'list_expenses',
    'Outsourcing expenses with paid / unpaid totals and a per-vendor summary (how much is owed to each freelancer).',
    {
      project: z.string().optional(),
      paidTo: z.string().optional(),
      status: ciEnum(['UNPAID', 'PAID']).optional(),
    },
    async ({ project, ...rest }) =>
      biz.listExpenses({ ...rest, mscProjectId: project ? (await ws.findProject(project)).id : undefined }),
    true
  );

  tool(
    'get_finance',
    'Money per project: agreed revenue, received, outstanding, expenses (paid / unpaid), net profit so far (received - expenses) and projected profit if every agreed amount is paid (agreed - expenses), with each admin share of both, per project and totals per admin.',
    { project: z.string().optional() },
    async ({ project }) => biz.projectFinance(project ? (await ws.findProject(project)).id : undefined),
    true
  );

  /** Find a task by id or title, within one student or across all tasks. */
  const findAnyTask = async (ref: string, student?: string) => {
    if (student) return ws.findTask((await ws.findStudent(student)).id, ref);
    const byId = await prisma.task.findUnique({ where: { id: ref } });
    if (byId) return byId;
    const matches = await prisma.task.findMany({ where: { title: { contains: ref, mode: 'insensitive' } }, include: { student: { select: { name: true } } } });
    if (matches.length === 1) return matches[0];
    if (!matches.length) throw new HttpError(404, `Task "${ref}" not found`);
    throw new HttpError(400, `"${ref}" matches several tasks: ${matches.map((m) => `${m.title} (${m.student?.name || 'general'}, id ${m.id})`).join('; ')}. Give the student or the id.`);
  };

  tool(
    'update_task',
    'Update a task (student sprint task or general my-work task) by title (partial ok) or id: status TODO / IN_PROGRESS / BLOCKED / DONE, due date, title, assignee.',
    {
      task: z.string().describe('Task title (partial ok) or id'),
      student: z.string().optional().describe('Narrow the search to one student'),
      status: ciEnum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
      title: z.string().optional(),
      dueDate: z.string().optional(),
      description: z.string().optional(),
      assignTo: z.string().optional().describe('Admin name or email; "none" to unassign'),
    },
    async ({ task, student, assignTo, ...rest }) => {
      const t = await findAnyTask(task, student);
      const assigneeAdminId = assignTo === undefined ? undefined : assignTo.toLowerCase() === 'none' ? null : await ws.resolveAdminId(assignTo);
      return ws.updateTask(t.id, { ...rest, ...(assigneeAdminId !== undefined && { assigneeAdminId }) });
    }
  );

  tool(
    'delete_task',
    'Delete a task by title or id.',
    { task: z.string(), student: z.string().optional() },
    async ({ task, student }) => ws.deleteTask((await findAnyTask(task, student)).id),
    'destructive'
  );

  // ---------------------------------------------------------------- payments
  tool(
    'record_payment',
    'Record a payment received from a student, optionally against a stage.',
    {
      student: z.string(),
      amount: z.number().positive(),
      stage: z.string().optional(),
      notes: z.string().optional(),
      receivedAt: z.string().optional(),
      asAdmin,
    },
    async ({ student, amount, stage, notes, receivedAt, asAdmin: who }) => {
      const s = await ws.findStudent(student);
      const submissionId = stage ? (await ws.findSubmission(s.id, stage)).id : null;
      return prisma.payment.create({
        data: {
          studentId: s.id,
          submissionId,
          amount,
          status: 'RECEIVED',
          receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
          recordedByAdminId: await admin(who),
          notes: notes || null,
        },
      });
    }
  );

  // ---------------------------------------------------------------- payments (manage)
  tool(
    'list_payments',
    'List payments (with ids) for a project and/or student.',
    { project: z.string().optional(), student: z.string().optional() },
    async ({ project, student }) =>
      biz.listPayments({
        mscProjectId: project ? (await ws.findProject(project)).id : undefined,
        studentId: student ? (await ws.findStudent(student)).id : undefined,
      }),
    'read'
  );

  tool(
    'update_payment',
    'Edit a payment: amount, status (PENDING / RECEIVED / PARTIAL), notes, received date.',
    {
      paymentId: z.string(),
      amount: z.number().optional(),
      status: ciEnum(['PENDING', 'RECEIVED', 'PARTIAL']).optional(),
      notes: z.string().optional(),
      receivedAt: z.string().optional(),
    },
    async ({ paymentId, ...rest }) => biz.updatePayment(paymentId, rest)
  );

  tool('delete_payment', 'Delete a payment record.', { paymentId: z.string() }, async ({ paymentId }) => biz.deletePayment(paymentId), 'destructive');

  // ---------------------------------------------------------------- admin split
  tool(
    'set_admin_split',
    'Set how a project profit is shared between admins. Percentages must total 100. Replaces the existing split.',
    {
      project: z.string(),
      splits: z.array(z.object({ admin: z.string().describe('Admin name or email'), percentage: z.number() })).min(1),
    },
    async ({ project, splits }) => {
      const projectId = (await ws.findProject(project)).id;
      const rows = await Promise.all(splits.map(async (x) => ({ adminId: (await ws.resolveAdminId(x.admin))!, percentage: x.percentage })));
      return biz.setAdminSplits(projectId, rows);
    }
  );

  // ---------------------------------------------------------------- deliverables / expenses (manage)
  const findDeliverable = async (project: string, ref: string) => {
    const projectId = (await ws.findProject(project)).id;
    const all = await biz.listProjectDeliverables(projectId);
    const d = all.find((x) => x.id === ref) || all.find((x) => x.title.toLowerCase().includes(ref.toLowerCase()));
    if (!d) throw new HttpError(404, `Deliverable "${ref}" not found. Deliverables: ${all.map((x) => x.title).join(', ') || 'none'}`);
    return d;
  };

  tool(
    'update_project_deliverable',
    'Rename a project deliverable, change its details or due date (applies to students it has not been sent to yet).',
    { project: z.string(), deliverable: z.string(), title: z.string().optional(), description: z.string().optional(), dueDate: z.string().optional() },
    async ({ project, deliverable, ...rest }) => biz.updateProjectDeliverable((await findDeliverable(project, deliverable)).id, rest)
  );

  tool(
    'delete_project_deliverable',
    'Delete a project deliverable and every student copy of it.',
    { project: z.string(), deliverable: z.string() },
    async ({ project, deliverable }) => biz.deleteProjectDeliverable((await findDeliverable(project, deliverable)).id),
    'destructive'
  );

  tool(
    'update_expense',
    'Edit an outsourcing expense (get ids from list_expenses): vendor, amount, description, student, notes, PAID / UNPAID.',
    {
      expenseId: z.string(),
      paidTo: z.string().optional(),
      amount: z.number().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      status: ciEnum(['UNPAID', 'PAID']).optional(),
    },
    async ({ expenseId, ...rest }) => biz.updateExpense(expenseId, rest)
  );

  tool('delete_expense', 'Delete an outsourcing expense.', { expenseId: z.string() }, async ({ expenseId }) => biz.deleteExpense(expenseId), 'destructive');

  // ---------------------------------------------------------------- project setup (manage)
  const findStage = async (project: string, stage: string) => {
    const p = await ws.getProject((await ws.findProject(project)).id);
    const n = Number(stage);
    const tpl =
      p.submissionTemplates.find((s) => s.id === stage || (!isNaN(n) && s.order === n)) ||
      p.submissionTemplates.find((s) => s.name.toLowerCase().includes(stage.toLowerCase()));
    if (!tpl) throw new HttpError(404, `Stage "${stage}" not found`);
    return tpl;
  };

  tool(
    'delete_stage',
    'Delete a submission stage from a project (only if no student has work recorded on it).',
    { project: z.string(), stage: z.string() },
    async ({ project, stage }) => ws.deleteSubmissionTemplate((await findStage(project, stage)).id),
    'destructive'
  );

  tool(
    'split_stage_payments_evenly',
    'Spread 100% of payment evenly across a project stages (remainder on the last) and mark the last stage final.',
    { project: z.string() },
    async ({ project }) => {
      const p = await ws.getProject((await ws.findProject(project)).id);
      const all = p.submissionTemplates;
      const base = all.length ? Math.floor(100 / all.length) : 0;
      for (const [i, st] of all.entries()) {
        await ws.updateSubmissionTemplate(st.id, { paymentPercentage: i === all.length - 1 ? 100 - base * (all.length - 1) : base, isFinal: i === all.length - 1 });
      }
      return (await ws.getProject(p.id)).submissionTemplates;
    }
  );

  const findChecklistItem = async (project: string, item: string) => {
    const p = await ws.getProject((await ws.findProject(project)).id);
    const t = p.taskTemplates.find((x) => x.id === item) || p.taskTemplates.find((x) => x.title.toLowerCase().includes(item.toLowerCase()));
    if (!t) throw new HttpError(404, `Checklist item "${item}" not found`);
    return t;
  };

  tool(
    'update_checklist_item',
    'Edit an item of a project default sprint checklist.',
    { project: z.string(), item: z.string(), title: z.string().optional(), description: z.string().optional() },
    async ({ project, item, ...rest }) => ws.updateTaskTemplate((await findChecklistItem(project, item)).id, rest)
  );

  tool(
    'delete_checklist_item',
    'Remove an item from a project default sprint checklist (existing student tasks are kept).',
    { project: z.string(), item: z.string() },
    async ({ project, item }) => ws.deleteTaskTemplate((await findChecklistItem(project, item)).id),
    'destructive'
  );

  // ---------------------------------------------------------------- cleanup
  tool('remove_link', 'Remove a link (ids are in get_student).', { linkId: z.string() }, async ({ linkId }) => ws.deleteLink(linkId), 'destructive');
  tool('delete_note', 'Delete a note (ids are in get_student).', { noteId: z.string() }, async ({ noteId }) => ws.deleteNote(noteId), 'destructive');
  tool('delete_delivery', 'Delete one delivery (ids are in get_student / list_deliveries).', { deliveryId: z.string() }, async ({ deliveryId }) => ws.deleteDelivery(deliveryId), 'destructive');

  tool(
    'remove_student_from_project',
    'Unenroll a student from one project: deletes their stages, tasks, deliveries and payments for that project. Their contact record and other projects are kept.',
    { student: z.string().describe('Name or "Name @ Project"') },
    async ({ student }) => biz.unenrollStudent((await ws.findStudent(student)).id),
    'destructive'
  );

  tool(
    'delete_project',
    'Permanently delete a project with all its students enrollments, stages, deliverables, expenses and payments. confirmName must equal the project name exactly.',
    { project: z.string(), confirmName: z.string() },
    async ({ project, confirmName }) => {
      const p = await ws.findProject(project);
      if (p.name.trim() !== confirmName.trim()) throw new HttpError(400, `confirmName must be exactly "${p.name}"`);
      return biz.deleteProject(p.id);
    },
    'destructive'
  );

  // ---------------------------------------------------------------- overview
  tool(
    'get_overview',
    'One-call summary of the whole business: per-project money (received and if-fully-paid), admin shares, open work counts.',
    {},
    async () => {
      const [fin, agenda, students] = await Promise.all([
        biz.projectFinance(),
        ws.getAgenda(14),
        prisma.student.groupBy({ by: ['status'], _count: true }),
      ]);
      return {
        totals: fin.totals,
        perProject: fin.perProject.map((p) => ({
          project: p.projectName,
          students: p.students,
          agreed: p.agreedRevenue,
          received: p.received,
          expenses: p.expenses,
          expensesUnpaid: p.expensesUnpaid,
          netProfitSoFar: p.netProfit,
          netProfitIfFullyPaid: p.projectedProfit,
        })),
        perAdmin: fin.perAdmin,
        studentsByStatus: Object.fromEntries(students.map((s) => [s.status, s._count])),
        attention: {
          overdueStages: agenda.overdueStages.length,
          upcomingStages: agenda.upcomingStages.length,
          awaitingReview: agenda.awaitingReview.length,
          plannedDeliveries: agenda.plannedDeliveries.length,
          openTasks: agenda.openTasks.length,
        },
      };
    },
    'read'
  );

  return server;
};
