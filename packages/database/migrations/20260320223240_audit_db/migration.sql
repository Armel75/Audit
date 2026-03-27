/*
  Warnings:

  - You are about to drop the column `token` on the `PasswordResetToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenHash]` on the table `PasswordResetToken` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHash` to the `PasswordResetToken` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[PasswordResetToken] DROP CONSTRAINT [PasswordResetToken_token_key];

-- AlterTable
ALTER TABLE [dbo].[PasswordResetToken] DROP COLUMN [token];
ALTER TABLE [dbo].[PasswordResetToken] ADD [tokenHash] VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Tenant] ALTER COLUMN [updatedAt] DATETIME2 NULL;

-- CreateIndex
ALTER TABLE [dbo].[PasswordResetToken] ADD CONSTRAINT [PasswordResetToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PasswordResetToken_tokenHash_idx] ON [dbo].[PasswordResetToken]([tokenHash]);

-- CreateIndex
ALTER TABLE [dbo].[Role] ADD CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name]);

-- CreateIndex
ALTER TABLE [dbo].[Tenant] ADD CONSTRAINT [Tenant_name_key] UNIQUE NONCLUSTERED ([name]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
