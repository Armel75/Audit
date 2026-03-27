/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,name,isActive]` on the table `AuditType` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AuditType] ADD [isActive] BIT NOT NULL CONSTRAINT [AuditType_isActive_df] DEFAULT 1;

-- CreateIndex
ALTER TABLE [dbo].[AuditType] ADD CONSTRAINT [AuditType_tenantId_name_isActive_key] UNIQUE NONCLUSTERED ([tenantId], [name], [isActive]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
