-- Add unique constraints per DDS (KB #112)
ALTER TABLE "template"."connection_templates" ADD CONSTRAINT "connection_templates_service_type_version_key" UNIQUE ("service_type", "version");
ALTER TABLE "template"."skill_templates" ADD CONSTRAINT "skill_templates_skill_type_version_key" UNIQUE ("skill_type", "version");
