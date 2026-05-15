import { PrismaClient, Role, Status, Currency, Priority, PaymentType, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.student.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@outsourcepro.com',
      name: 'James Wilson',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  // Create Subjects
  const subject1 = await prisma.subject.create({
    data: {
      name: 'Business Law Research',
      code: 'BL-2024',
      description: 'Advanced legal research and analysis',
      status: Status.ACTIVE,
      revenueINR: 125000,
    },
  });

  // Create Students
  const student1 = await prisma.student.create({
    data: {
      name: 'Rahul Sharma',
      email: 'rahul.s@example.com',
      status: Status.ACTIVE,
      subjects: { connect: { id: subject1.id } },
    },
  });

  // Create Vendor
  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'Quantum Solutions',
      email: 'contact@quantum.com',
      rating: 4.8,
      status: Status.ACTIVE,
    },
  });

  // Create Project
  await prisma.project.create({
    data: {
      title: 'Corporate Law Review',
      status: Status.ACTIVE,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subjectId: subject1.id,
      studentId: student1.id,
      vendorId: vendor1.id,
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
