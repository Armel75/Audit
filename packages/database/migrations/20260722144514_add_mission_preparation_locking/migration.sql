BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AuditMission] ALTER COLUMN [planId] INT NULL;
ALTER TABLE [dbo].[AuditMission] ALTER COLUMN [leaderId] INT NULL;

-- CreateTable
CREATE TABLE [dbo].[AuditMissionPreparation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [missionId] INT NOT NULL,
    [phase] VARCHAR(100) NOT NULL CONSTRAINT [AuditMissionPreparation_phase_df] DEFAULT 'INTAKE',
    [version] INT NOT NULL CONSTRAINT [AuditMissionPreparation_version_df] DEFAULT 1,
    [lockedById] INT,
    [lockedAt] DATETIME2,
    [intakeCompletedById] INT,
    [intakeCompletedAt] DATETIME2,
    [enrichmentCompletedById] INT,
    [enrichmentCompletedAt] DATETIME2,
    [reviewCompletedById] INT,
    [reviewCompletedAt] DATETIME2,
    [readyAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditMissionPreparation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AuditMissionPreparation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditMissionPreparation_missionId_key] UNIQUE NONCLUSTERED ([missionId])
);

-- CreateTable
CREATE TABLE [dbo].[AuditMissionPreparationHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [missionId] INT NOT NULL,
    [preparationId] INT,
    [fromPhase] VARCHAR(100),
    [toPhase] VARCHAR(100) NOT NULL,
    [reason] VARCHAR(4000),
    [actionType] VARCHAR(100),
    [changedById] INT,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [AuditMissionPreparationHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditMissionPreparationHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionPreparation_tenantId_phase_idx] ON [dbo].[AuditMissionPreparation]([tenantId], [phase]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionPreparation_tenantId_missionId_idx] ON [dbo].[AuditMissionPreparation]([tenantId], [missionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionPreparation_lockedById_idx] ON [dbo].[AuditMissionPreparation]([lockedById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionPreparationHistory_tenantId_missionId_changedAt_idx] ON [dbo].[AuditMissionPreparationHistory]([tenantId], [missionId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionPreparationHistory_tenantId_missionId_toPhase_changedAt_idx] ON [dbo].[AuditMissionPreparationHistory]([tenantId], [missionId], [toPhase], [changedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparation] ADD CONSTRAINT [AuditMissionPreparation_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparation] ADD CONSTRAINT [AuditMissionPreparation_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparation] ADD CONSTRAINT [AuditMissionPreparation_lockedById_fkey] FOREIGN KEY ([lockedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparation] ADD CONSTRAINT [AuditMissionPreparation_intakeCompletedById_fkey] FOREIGN KEY ([intakeCompletedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparation] ADD CONSTRAINT [AuditMissionPreparation_enrichmentCompletedById_fkey] FOREIGN KEY ([enrichmentCompletedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparation] ADD CONSTRAINT [AuditMissionPreparation_reviewCompletedById_fkey] FOREIGN KEY ([reviewCompletedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparationHistory] ADD CONSTRAINT [AuditMissionPreparationHistory_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparationHistory] ADD CONSTRAINT [AuditMissionPreparationHistory_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparationHistory] ADD CONSTRAINT [AuditMissionPreparationHistory_preparationId_fkey] FOREIGN KEY ([preparationId]) REFERENCES [dbo].[AuditMissionPreparation]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionPreparationHistory] ADD CONSTRAINT [AuditMissionPreparationHistory_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
