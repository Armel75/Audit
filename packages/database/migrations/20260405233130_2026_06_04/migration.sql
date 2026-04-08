/*
  Warnings:

  - You are about to drop the column `missionId` on the `AuditProcedure` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[programId,sequenceNo]` on the table `AuditProcedure` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[AuditProcedure] DROP CONSTRAINT [AuditProcedure_missionId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[AuditProcedure] DROP CONSTRAINT [AuditProcedure_programId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[AuditProcedure] DROP CONSTRAINT [AuditProcedure_programVersionId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[AuditProgram] DROP CONSTRAINT [AuditProgram_preparedById_fkey];

-- DropIndex
DROP INDEX [AuditProcedure_programId_sequenceNo_idx] ON [dbo].[AuditProcedure];

-- DropIndex
DROP INDEX [AuditProcedure_tenantId_missionId_idx] ON [dbo].[AuditProcedure];

-- AlterTable
ALTER TABLE [dbo].[AuditProcedure] DROP CONSTRAINT [AuditProcedure_sequenceNo_df],
[AuditProcedure_status_df];
ALTER TABLE [dbo].[AuditProcedure] DROP COLUMN [missionId];
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_status_df] DEFAULT 'PLANNED' FOR [status];
ALTER TABLE [dbo].[AuditProcedure] ADD [assignedToId] INT,
[businessProcessId] INT,
[code] VARCHAR(255),
[controlId] INT,
[issueDetected] BIT NOT NULL CONSTRAINT [AuditProcedure_issueDetected_df] DEFAULT 0,
[plannedAt] DATETIME2,
[priorityId] INT,
[result] VARCHAR(100),
[reviewComment] VARCHAR(4000),
[reviewStatus] VARCHAR(100),
[reviewedAt] DATETIME2,
[reviewedById] INT,
[reworkCount] INT NOT NULL CONSTRAINT [AuditProcedure_reworkCount_df] DEFAULT 0,
[riskId] INT,
[severity] VARCHAR(100),
[snapshot] VARCHAR(4000),
[startedAt] DATETIME2;

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [procedureId] INT;

-- AlterTable
ALTER TABLE [dbo].[Finding] ADD [procedureId] INT;

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProcedure_tenantId_programId_idx] ON [dbo].[AuditProcedure]([tenantId], [programId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProcedure_controlId_idx] ON [dbo].[AuditProcedure]([controlId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProcedure_riskId_idx] ON [dbo].[AuditProcedure]([riskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProcedure_businessProcessId_idx] ON [dbo].[AuditProcedure]([businessProcessId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProcedure_status_idx] ON [dbo].[AuditProcedure]([status]);

-- CreateIndex
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_programId_sequenceNo_key] UNIQUE NONCLUSTERED ([programId], [sequenceNo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_procedureId_idx] ON [dbo].[Document]([procedureId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Finding_procedureId_idx] ON [dbo].[Finding]([procedureId]);

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgram] ADD CONSTRAINT [AuditProgram_preparedById_fkey] FOREIGN KEY ([preparedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[AuditProgram]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_programVersionId_fkey] FOREIGN KEY ([programVersionId]) REFERENCES [dbo].[AuditProgramVersion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_priorityId_fkey] FOREIGN KEY ([priorityId]) REFERENCES [dbo].[PriorityLevel]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_controlId_fkey] FOREIGN KEY ([controlId]) REFERENCES [dbo].[Control]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_riskId_fkey] FOREIGN KEY ([riskId]) REFERENCES [dbo].[Risk]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_businessProcessId_fkey] FOREIGN KEY ([businessProcessId]) REFERENCES [dbo].[BusinessProcess]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_assignedToId_fkey] FOREIGN KEY ([assignedToId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_reviewedById_fkey] FOREIGN KEY ([reviewedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[AuditProcedure]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[AuditProcedure]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
