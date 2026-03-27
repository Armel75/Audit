/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
DROP INDEX [Department_tenantId_name_idx] ON [dbo].[Department];

-- CreateIndex
ALTER TABLE [dbo].[Department] ADD CONSTRAINT [Department_tenantId_name_key] UNIQUE NONCLUSTERED ([tenantId], [name]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
