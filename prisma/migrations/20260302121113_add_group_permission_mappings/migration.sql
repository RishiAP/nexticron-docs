-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "group_permission_mappings" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_permission_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_permission_mappings_groupName_idx" ON "group_permission_mappings"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "group_permission_mappings_groupName_libraryId_key" ON "group_permission_mappings"("groupName", "libraryId");

-- AddForeignKey
ALTER TABLE "group_permission_mappings" ADD CONSTRAINT "group_permission_mappings_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
