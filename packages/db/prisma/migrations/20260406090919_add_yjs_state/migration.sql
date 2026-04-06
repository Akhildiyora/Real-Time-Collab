-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "yjsState" BYTEA,
ALTER COLUMN "content" SET DEFAULT '';
