/*
  Warnings:

  - A unique constraint covering the columns `[libraryVersionId,parentPath,slug]` on the table `docs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[libraryVersionId,parentPath,title]` on the table `docs` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "docs_libraryVersionId_slug_parentPath_key";

-- CreateIndex
CREATE UNIQUE INDEX "docs_libraryVersionId_parentPath_slug_key" ON "docs"("libraryVersionId", "parentPath", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "docs_libraryVersionId_parentPath_title_key" ON "docs"("libraryVersionId", "parentPath", "title");
