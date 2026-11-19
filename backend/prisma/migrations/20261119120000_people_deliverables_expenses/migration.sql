-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('UNPAID', 'PAID');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "projectDeliverableId" TEXT;

-- AlterTable
ALTER TABLE "Outsourcing" ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'UNPAID',
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "personId" TEXT,
ALTER COLUMN "projectTitle" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "mscProjectId" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "rollNo" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- Backfill: one Person per existing enrollment
INSERT INTO "Person" ("id", "name", "mobileNo", "rollNo", "email", "createdAt")
SELECT 'per_' || s."id", s."name", s."mobileNo", s."rollNo", s."email", s."createdAt" FROM "Student" s;
UPDATE "Student" SET "personId" = 'per_' || "id" WHERE "personId" IS NULL;
ALTER TABLE "Student" ALTER COLUMN "personId" SET NOT NULL;

-- Backfill: tasks inherit their student's project
UPDATE "Task" t SET "mscProjectId" = s."mscProjectId" FROM "Student" s WHERE t."studentId" = s."id" AND t."mscProjectId" IS NULL;

-- CreateTable
CREATE TABLE "ProjectDeliverable" (
    "id" TEXT NOT NULL,
    "mscProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDeliverable_mscProjectId_idx" ON "ProjectDeliverable"("mscProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_projectDeliverableId_studentId_key" ON "Delivery"("projectDeliverableId", "studentId");

-- CreateIndex
CREATE INDEX "Student_personId_idx" ON "Student"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_mscProjectId_personId_key" ON "Student"("mscProjectId", "personId");

-- CreateIndex
CREATE INDEX "Task_assigneeAdminId_idx" ON "Task"("assigneeAdminId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_mscProjectId_fkey" FOREIGN KEY ("mscProjectId") REFERENCES "MscProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_projectDeliverableId_fkey" FOREIGN KEY ("projectDeliverableId") REFERENCES "ProjectDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_mscProjectId_fkey" FOREIGN KEY ("mscProjectId") REFERENCES "MscProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

