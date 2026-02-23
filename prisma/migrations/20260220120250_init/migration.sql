-- CreateTable
CREATE TABLE "libraries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "libraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentPath" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "libraryVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "docs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "libraries_name_key" ON "libraries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_slug_key" ON "libraries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "library_versions_libraryId_version_key" ON "library_versions"("libraryId", "version");

-- CreateIndex
CREATE INDEX "docs_libraryVersionId_idx" ON "docs"("libraryVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "docs_libraryVersionId_slug_parentPath_key" ON "docs"("libraryVersionId", "slug", "parentPath");

-- AddForeignKey
ALTER TABLE "library_versions" ADD CONSTRAINT "library_versions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docs" ADD CONSTRAINT "docs_libraryVersionId_fkey" FOREIGN KEY ("libraryVersionId") REFERENCES "library_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
