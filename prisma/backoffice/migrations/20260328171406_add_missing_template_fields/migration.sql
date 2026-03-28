-- AlterTable
ALTER TABLE "connection_templates" ADD COLUMN     "deprecated_at" TIMESTAMPTZ,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "icon" VARCHAR,
ALTER COLUMN "version" SET DEFAULT '1.0.0',
ALTER COLUMN "spec" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "skill_templates" ADD COLUMN     "deprecated_at" TIMESTAMPTZ,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "icon" VARCHAR,
ALTER COLUMN "version" SET DEFAULT '1.0.0',
ALTER COLUMN "spec" SET DEFAULT '{}';
