-- AlterTable
ALTER TABLE "patrimoni"."ifcbuilding" DROP COLUMN "color";

-- CreateTable
CREATE TABLE "patrimoni"."actiu_images" (
    "id" TEXT NOT NULL,
    "actiuGuid" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "description" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actiu_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrimoni"."maintenance_record" (
    "id" TEXT NOT NULL,
    "actiuGuid" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "nextPlannedAt" TIMESTAMP(3),
    "periodMonths" INTEGER,
    "periodDays" INTEGER,
    "responsible" TEXT,
    "incidents" TEXT,
    "correctiveActions" TEXT,
    "checklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrimoni"."maintenance_attachment" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "type" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actiu_images_actiuGuid_sortOrder_idx" ON "patrimoni"."actiu_images"("actiuGuid", "sortOrder");

-- CreateIndex
CREATE INDEX "actiu_images_actiuGuid_createdAt_idx" ON "patrimoni"."actiu_images"("actiuGuid", "createdAt");

-- CreateIndex
CREATE INDEX "maintenance_record_actiuGuid_performedAt_idx" ON "patrimoni"."maintenance_record"("actiuGuid", "performedAt");

-- CreateIndex
CREATE INDEX "maintenance_attachment_recordId_idx" ON "patrimoni"."maintenance_attachment"("recordId");

-- AddForeignKey
ALTER TABLE "patrimoni"."actiu_images" ADD CONSTRAINT "actiu_images_actiuGuid_fkey" FOREIGN KEY ("actiuGuid") REFERENCES "patrimoni"."actius"("guid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimoni"."maintenance_record" ADD CONSTRAINT "maintenance_record_actiuGuid_fkey" FOREIGN KEY ("actiuGuid") REFERENCES "patrimoni"."actius"("guid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimoni"."maintenance_attachment" ADD CONSTRAINT "maintenance_attachment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "patrimoni"."maintenance_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;



