# Project Portal

Track student project builds as sprints: one shared **project brief**, a set of
**submission stages** every student goes through, and per-student **work links**,
**deliveries**, **sprint tasks**, **notes** and **payments**. Everything can also be
managed from Claude through the built-in **MCP server**.

## How it fits together

| Concept | What it is |
|---|---|
| **Project** | The umbrella (e.g. "2026 MSc projects"): briefing text, brief document link, price range. |
| **Submission stage** (template) | Defined once per project: Proposal → Midpoint PPT → Final… with a template link, instructions, deadline offset, payment %, and which links are required (GitHub / Google Doc / PPT / Colab…). |
| **Sprint checklist** (template) | Default tasks copied into every new student build. |
| **Person** | A real student (name, mobile, roll no, email). One person can be enrolled in several projects; contact changes apply to all of them. |
| **Student build** (enrollment) | One person in one project, with their own (optional) topic and price. Enrolling, either a new person or tagging an existing one, creates one submission per stage (deadlines from the offsets), the task list, and planned deliveries for the project's deliverables. |
| **Submission** | A student's instance of a stage: typed links, status lifecycle, peer review, notes, student feedback. |
| **Delivery** | Something you sent (or plan to send) the student: title, links, channel, stage. Planned deliveries show as overdue when late. |
| **Project deliverable** | Defined once per project ("Week 3 results pack"); every student gets a planned delivery, so you can see delivered X / Y and who is still waiting. |
| **Task** | Sprint checklist item for one student build, or a general work item on the **My work** board (To do / In progress / Blocked / Done, assignable to an admin). |
| **Expense** | Outsourcing cost for a project (or one student in it), paid to a freelancer/vendor, marked **Unpaid** or **Paid**. The per-vendor summary shows what you still owe each person. |
| **Admin split** | Set per project (must total 100%). Shares are shown per project, from money received and from profit after expenses, plus totals per admin. |

Submission lifecycle: `PENDING → SUBMITTED → (CHANGES_REQUESTED ↺) APPROVED → SHARED_WITH_STUDENT → FEEDBACK_RECEIVED → COMPLETED`.
A different admin must review work than the one who submitted it. Completing the final stage completes the student.

## Running locally

Prerequisites: Node 18+, PostgreSQL.

```bash
npm run install:all                      # root + frontend + backend deps
cp backend/.env.example backend/.env     # then fill in DATABASE_URL, JWT_SECRET, MCP_API_TOKEN
cd backend && npx prisma migrate deploy  # apply migrations (never resets data)
npm run dev                              # API on :5001
cd ../frontend && npm run dev            # UI on :3000
```

Log in with an admin account (see `backend/prisma/seed.json`). Change the password after first login
via `POST /api/auth/change-password`.

### Data scripts

- `npm run import:csv` (in `backend/`): non-destructive import of `current-project.csv`
  (links, meeting day, status/feedback notes) for students that already exist. Safe to re-run.
- `npx prisma db seed`: **wipes everything** and loads `seed.json`. It refuses to run if students
  exist unless `SEED_RESET=1` is set.

## MCP: manage it from Claude

The same 55 tools are served two ways. Tools that delete things are marked destructive, so MCP clients ask before running them. Students, stages and tasks are referenced by name
("sruthi", "midpoint"), not IDs. If a person is in several projects, use "Sruthi @ project name".

**Local (stdio)**: `.mcp.json` in the repo root registers the `project-portal` server for Claude Code
automatically (it connects directly to `DATABASE_URL` from `backend/.env`). For Claude Desktop, add:

```json
{
  "mcpServers": {
    "project-portal": {
      "command": "/ABSOLUTE/PATH/backend/node_modules/.bin/ts-node",
      "args": ["--transpile-only", "/ABSOLUTE/PATH/backend/src/mcp/stdio.ts"]
    }
  }
}
```

**Remote (HTTP)**: `POST /api/mcp` on the deployed backend (Streamable HTTP, stateless).
Authenticate with `Authorization: Bearer <MCP_API_TOKEN>` (or a portal login JWT, which makes the tools
act as that admin). Set `MCP_API_TOKEN` in the host's environment.

```bash
claude mcp add --transport http project-portal https://YOUR-HOST/api/mcp \
  --header "Authorization: Bearer $MCP_API_TOKEN"
```

Example requests to Claude:

- "What needs attention this week?" → `get_agenda`
- "Enroll Priya on the 2026 project, topic 'Crop disease detection', £250, roll 2026-REH-003, phone …"
- "Sruthi's midpoint PPT is ready: https://docs.google.com/presentation/… — mark it submitted"
- "Approve Anirudh's proposal as Sachin, note: objectives look good"
- "Log that I sent Sruthi the week 3 results notebook on WhatsApp: https://colab…"
- "Plan to send Anirudh the viva PPT draft on 1 Aug"
- "Enroll Sruthi, Anirudh and Shiva into test -1" (price defaults to the last student's amount)
- "If everyone pays, what's the profit on test -1 and what does each admin get?" · "Set test -1 split to Sachin 35, SVR 65"
- "Tag Sruthi into the 2027 project at £250" · "Add a deliverable 'Week 3 pack' to the 2026 project, due Friday"
- "Who hasn't received the week 3 pack?" · "Mark the week 3 pack sent to everyone"
- "Log £150 to Sridhar for test -1, not paid yet" · "I paid Sridhar" · "What do I owe each freelancer?"
- "What's my work today?" · "How much is each admin's share per project?"
- "Mark Sruthi's 'train model' task done" · "Add a note to Anirudh: weekly meeting, dataset switched to UA-DETRAC"

Tools: `get_agenda`, `list_admins`, `list_projects`, `get_project`, `create_project`, `update_project`,
`add_stage`, `update_stage`, `add_checklist_item`, `list_students`, `get_student`, `enroll_student`,
`update_student`, `add_student_link`, `submit_stage_work`, `add_stage_link`, `review_stage`,
`share_stage_with_student`, `record_student_feedback`, `set_stage_status`, `add_note`, `log_delivery`,
`update_delivery`, `list_deliveries`, `add_task`, `update_task`, `record_payment`, `list_people`,
`get_my_work`, `add_project_deliverable`, `list_project_deliverables`, `mark_deliverable_sent`, `log_expense`,
`mark_expense_paid`, `list_expenses`, `get_finance`, `get_overview`, `list_payments`, `update_payment`,
`delete_payment`, `set_admin_split`, `update_project_deliverable`, `delete_project_deliverable`, `update_expense`,
`delete_expense`, `delete_stage`, `split_stage_payments_evenly`, `update_checklist_item`, `delete_checklist_item`,
`delete_task`, `remove_link`, `delete_note`, `delete_delivery`, `remove_student_from_project`, `delete_project`
(requires typing the exact project name).

## Tech stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Zustand, Recharts
- **Backend**: Express, TypeScript, Prisma, PostgreSQL, JWT auth, `@modelcontextprotocol/sdk`
- Business logic lives in `backend/src/services/workspace.service.ts`, shared by the REST API
  (`controllers/`) and the MCP server (`src/mcp/`).
