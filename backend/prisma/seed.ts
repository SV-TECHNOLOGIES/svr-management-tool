import { PrismaClient, Role, StudentStatus, SubmissionStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Reading seed.json file...');
  const jsonPath = path.join(__dirname, 'seed.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`seed.json not found at path: ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const seedData = JSON.parse(rawData);

  console.log('Clearing existing database records...');
  await prisma.note.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.outsourcing.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.submissionTemplate.deleteMany();
  await prisma.student.deleteMany();
  await prisma.adminSplit.deleteMany();
  await prisma.mscProject.deleteMany();
  await prisma.admin.deleteMany();

  const hashedPassword = await bcrypt.hash('Svr@2026#', 10);
  const adminMap = new Map<string, string>(); // email -> adminId

  // 1. Seed Admins
  for (const admin of seedData.admins || []) {
    const created = await prisma.admin.create({
      data: {
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        role: (admin.role as Role) || Role.ADMIN,
      },
    });
    adminMap.set(admin.email, created.id);
  }

  // 2. Seed MSc Projects
  for (const projectData of seedData.mscProjects || []) {
    const createdProject = await prisma.mscProject.create({
      data: {
        name: projectData.name,
        description: projectData.description,
        amountRangeLow: projectData.amountRangeLow,
        amountRangeHigh: projectData.amountRangeHigh,
        currency: projectData.currency || 'GBP',
        submissionTemplates: {
          create: (projectData.submissionTemplates || []).map((st: any) => ({
            name: st.name,
            order: st.order,
            isFinal: st.isFinal || false,
            deadlineOffsetDays: st.deadlineOffsetDays || 14,
            paymentPercentage: st.paymentPercentage,
            templateFileUrl: st.templateFileUrl || null,
          })),
        },
      },
      include: {
        submissionTemplates: { orderBy: { order: 'asc' } },
      },
    });

    // Seed Admin Splits for this project
    for (const split of projectData.adminSplits || []) {
      const adminId = adminMap.get(split.adminEmail);
      if (adminId) {
        await prisma.adminSplit.create({
          data: {
            mscProjectId: createdProject.id,
            adminId,
            percentage: split.percentage,
          },
        });
      }
    }

    const templateMap = new Map<number, string>(); // order -> templateId
    createdProject.submissionTemplates.forEach((t) => {
      templateMap.set(t.order, t.id);
    });

    // 3. Seed Students & Submissions
    for (const studentData of projectData.students || []) {
      const createdStudent = await prisma.student.create({
        data: {
          mscProjectId: createdProject.id,
          name: studentData.name,
          rollNo: studentData.rollNo,
          mobileNo: studentData.mobileNo,
          projectTitle: studentData.projectTitle,
          agreedAmount: studentData.agreedAmount,
          status: (studentData.status as StudentStatus) || StudentStatus.ACTIVE,
        },
      });

      // Advance payment
      if (studentData.advancePaid && Number(studentData.advancePaid) > 0) {
        await prisma.payment.create({
          data: {
            studentId: createdStudent.id,
            amount: Number(studentData.advancePaid),
            status: PaymentStatus.RECEIVED,
            receivedAt: new Date(),
            notes: `Initial advance payment of £${studentData.advancePaid} received`,
          },
        });
      }

      // Submissions
      for (const sub of studentData.submissions || []) {
        const templateId = templateMap.get(sub.stageOrder);
        if (templateId) {
          await prisma.submission.create({
            data: {
              studentId: createdStudent.id,
              submissionTemplateId: templateId,
              deadline: sub.deadline ? new Date(sub.deadline) : new Date(),
              fileLink: sub.fileLink || null,
              status: (sub.status as SubmissionStatus) || SubmissionStatus.PENDING,
              submittedByAdminId: sub.submittedByAdminEmail ? adminMap.get(sub.submittedByAdminEmail) || null : null,
              submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : null,
              reviewedByAdminId: sub.reviewedByAdminEmail ? adminMap.get(sub.reviewedByAdminEmail) || null : null,
              reviewedAt: sub.reviewedAt ? new Date(sub.reviewedAt) : null,
              studentFeedback: sub.studentFeedback || null,
              sharedWithStudent: Boolean(sub.sharedWithStudent),
            },
          });
        }
      }
    }
  }

  console.log('Database successfully seeded from seed.json!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
