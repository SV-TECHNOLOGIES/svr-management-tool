-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('GITHUB', 'GOOGLE_DOC', 'PPT', 'COLAB', 'DATASET', 'DRIVE', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PLANNED', 'SENT', 'ACKNOWLEDGED');

-- AlterTable
ALTER TABLE "MscProject" ADD COLUMN     "briefDocUrl" TEXT,
ADD COLUMN     "briefing" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "studentId" TEXT,
ALTER COLUMN "submissionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "email" TEXT,
ADD COLUMN     "meetingDay" TEXT;

-- AlterTable
ALTER TABLE "SubmissionTemplate" ADD COLUMN     "requiredLinkTypes" "LinkType"[] DEFAULT ARRAY[]::"LinkType"[];

-- CreateTable
CREATE TABLE "ProjectTaskTemplate" (
    "id" TEXT NOT NULL,
    "mscProjectId" TEXT NOT NULL,
    "submissionTemplateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "type" "LinkType" NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "url" TEXT NOT NULL,
    "studentId" TEXT,
    "submissionId" TEXT,
    "deliveryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submissionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SENT',
    "channel" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "sentByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submissionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "order" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "assigneeAdminId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTaskTemplate_mscProjectId_idx" ON "ProjectTaskTemplate"("mscProjectId");

-- CreateIndex
CREATE INDEX "Link_studentId_idx" ON "Link"("studentId");

-- CreateIndex
CREATE INDEX "Link_submissionId_idx" ON "Link"("submissionId");

-- CreateIndex
CREATE INDEX "Link_deliveryId_idx" ON "Link"("deliveryId");

-- CreateIndex
CREATE INDEX "Delivery_studentId_idx" ON "Delivery"("studentId");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "Task_studentId_idx" ON "Task"("studentId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Note_studentId_idx" ON "Note"("studentId");

-- AddForeignKey
ALTER TABLE "ProjectTaskTemplate" ADD CONSTRAINT "ProjectTaskTemplate_mscProjectId_fkey" FOREIGN KEY ("mscProjectId") REFERENCES "MscProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskTemplate" ADD CONSTRAINT "ProjectTaskTemplate_submissionTemplateId_fkey" FOREIGN KEY ("submissionTemplateId") REFERENCES "SubmissionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_sentByAdminId_fkey" FOREIGN KEY ("sentByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeAdminId_fkey" FOREIGN KEY ("assigneeAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Data migration: copy existing single fileLink values into the new Link table
INSERT INTO "Link" ("id", "type", "label", "url", "submissionId", "createdAt")
SELECT 'lnk_' || s."id",
  CASE
    WHEN s."fileLink" ILIKE '%github%' THEN 'GITHUB'::"LinkType"
    WHEN s."fileLink" ILIKE '%.ipynb%' OR s."fileLink" ILIKE '%colab%' THEN 'COLAB'::"LinkType"
    WHEN s."fileLink" ILIKE '%ppt%' OR s."fileLink" ILIKE '%presentation%' THEN 'PPT'::"LinkType"
    WHEN s."fileLink" ILIKE '%docs.google%' OR s."fileLink" ILIKE '%.docx%' THEN 'REPORT'::"LinkType"
    ELSE 'OTHER'::"LinkType"
  END,
  s."fileLink", s."fileLink", s."id", CURRENT_TIMESTAMP
FROM "Submission" s
WHERE s."fileLink" IS NOT NULL AND s."fileLink" <> '';
