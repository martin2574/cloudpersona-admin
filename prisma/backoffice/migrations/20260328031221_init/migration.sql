-- CreateTable
CREATE TABLE "categories" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "icon" VARCHAR NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_templates" (
    "id" UUID NOT NULL,
    "service_type" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "version" VARCHAR NOT NULL,
    "category_id" VARCHAR NOT NULL,
    "spec" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_templates" (
    "id" UUID NOT NULL,
    "skill_type" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "version" VARCHAR NOT NULL,
    "category_id" VARCHAR NOT NULL,
    "connection_template_id" UUID,
    "spec" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "connection_templates" ADD CONSTRAINT "connection_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_templates" ADD CONSTRAINT "skill_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_templates" ADD CONSTRAINT "skill_templates_connection_template_id_fkey" FOREIGN KEY ("connection_template_id") REFERENCES "connection_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
