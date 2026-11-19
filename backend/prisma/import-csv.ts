/**
 * Non-destructive importer for the tracking spreadsheet (current-project.csv).
 *
 *   npx ts-node prisma/import-csv.ts [path/to/file.csv]
 *
 * For each student row it matches an existing student by name and adds
 * (skipping anything already present): meeting day, project links
 * (Google Doc, Colab, GitHub, dataset), stage links (proposal doc, midpoint PPT,
 * final report) and a note with the spreadsheet status / feedback.
 * It never deletes or overwrites existing data. Unknown students are reported, not created.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { LinkType, PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clean = (s?: string) => (s || '').trim();
const meaningful = (s?: string) => {
  const v = clean(s).toLowerCase();
  return v && !['done', 'todo', 'sent', 'n/a', '-'].includes(v);
};

async function ensureLink(where: { studentId?: string; submissionId?: string }, type: LinkType, url: string, label: string) {
  if (!meaningful(url)) return false;
  const exists = await prisma.link.findFirst({ where: { ...where, url } });
  if (exists) return false;
  await prisma.link.create({ data: { ...where, type, url, label } });
  return true;
}

async function main() {
  const file = process.argv[2] || path.join(__dirname, '..', '..', 'current-project.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf-8'));
  const header = rows.find((r) => clean(r[0]).toUpperCase() === 'TOPIC');
  if (!header) throw new Error('Header row starting with TOPIC not found');
  const idx = (name: string, nth = 0) => {
    const hits = header.map((h, i) => [clean(h).toLowerCase(), i] as const).filter(([h]) => h.startsWith(name.toLowerCase()));
    return hits[nth]?.[1] ?? -1;
  };
  const col = {
    topic: idx('topic'),
    name: idx('student name'),
    gdoc: idx('google docs link'),
    ppt: idx('ppt links'),
    colab: idx('goole colab'),
    report: idx('submistion links'),
    github: idx('github from them'),
    plag: idx('pleg check'),
    meeting: idx('week meetings'),
    status: idx('status', 0),
    feedback: idx('feedback'),
    dataset: idx('dataset links'),
    midStatus: idx('status', 1),
    finalReview: idx('final review'),
  };

  const admin = await prisma.admin.findFirst({
    where: process.env.MCP_ADMIN_EMAIL ? { email: process.env.MCP_ADMIN_EMAIL } : {},
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new Error('No admin found to attribute notes to');

  const seen = new Set<string>();
  let added = 0;

  for (const r of rows) {
    const name = clean(r[col.name]);
    if (!name || clean(r[col.topic]).toUpperCase() === 'TOPIC' || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const candidates = await prisma.student.findMany({
      where: { name: { contains: name.split(/\s+/)[0], mode: 'insensitive' } },
      include: { submissions: { include: { submissionTemplate: true } } },
    });
    const student = candidates.find((c) => c.name.toLowerCase().replace(/\s+/g, ' ') === name.toLowerCase().replace(/\s+/g, ' ')) || (candidates.length === 1 ? candidates[0] : undefined);
    if (!student) {
      console.warn(`! No matching student for "${name}" — enroll them first (UI or MCP enroll_student), then re-run.`);
      continue;
    }

    const meeting = clean(r[col.meeting]);
    if (meeting && !student.meetingDay) {
      await prisma.student.update({ where: { id: student.id }, data: { meetingDay: meeting.charAt(0).toUpperCase() + meeting.slice(1).toLowerCase() } });
      added++;
    }

    const s = { studentId: student.id };
    if (await ensureLink(s, LinkType.GOOGLE_DOC, clean(r[col.gdoc]), 'Google Doc')) added++;
    if (await ensureLink(s, LinkType.COLAB, clean(r[col.colab]), 'Colab notebook')) added++;
    if (await ensureLink(s, LinkType.GITHUB, clean(r[col.github]), 'GitHub')) added++;
    if (await ensureLink(s, LinkType.DATASET, clean(r[col.dataset]), 'Dataset')) added++;

    const stage = (needle: string) => student.submissions.find((x) => x.submissionTemplate.name.toLowerCase().includes(needle));
    const proposal = stage('proposal');
    const midpoint = stage('midpoint');
    const final = stage('final');
    if (proposal && (await ensureLink({ submissionId: proposal.id }, LinkType.REPORT, clean(r[col.report]), 'Report'))) added++;
    if (midpoint && (await ensureLink({ submissionId: midpoint.id }, LinkType.PPT, clean(r[col.ppt]), 'Midpoint PPT'))) added++;

    const lines = [
      clean(r[col.status]) && `Status: ${clean(r[col.status])}`,
      clean(r[col.plag]) && `Plagiarism / AI check: ${clean(r[col.plag])}`,
      clean(r[col.feedback]) && `Feedback: ${clean(r[col.feedback])}`,
      clean(r[col.midStatus]) && midpoint && `Midpoint status: ${clean(r[col.midStatus])}`,
      clean(r[col.finalReview]) && final && `Final review requirement: ${clean(r[col.finalReview])}`,
    ].filter(Boolean);
    if (lines.length) {
      const content = `[Imported from spreadsheet]\n${lines.join('\n')}`;
      const exists = await prisma.note.findFirst({ where: { studentId: student.id, content } });
      if (!exists) {
        await prisma.note.create({ data: { studentId: student.id, adminId: admin.id, content } });
        added++;
      }
    }
    console.log(`✓ ${student.name}`);
  }
  console.log(`Done. ${added} new item(s) added.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
