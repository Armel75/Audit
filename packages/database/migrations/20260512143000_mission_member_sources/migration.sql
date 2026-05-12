BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ExternalParticipant] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [fullName] VARCHAR(4000) NOT NULL,
    [email] VARCHAR(255),
    [phone] VARCHAR(255),
    [organization] VARCHAR(4000),
    [title] VARCHAR(4000),
    [notes] VARCHAR(4000),
    [isActive] BIT NOT NULL CONSTRAINT [ExternalParticipant_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExternalParticipant_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExternalParticipant_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- Add mission member source fields
ALTER TABLE [dbo].[AuditMissionMember]
ADD [memberType] VARCHAR(50) NOT NULL CONSTRAINT [AuditMissionMember_memberType_df] DEFAULT 'INTERNAL_USER';

ALTER TABLE [dbo].[AuditMissionMember]
ADD [glpiUserId] INT;

ALTER TABLE [dbo].[AuditMissionMember]
ADD [externalParticipantId] INT;

-- Relax user relation to allow non-internal members
ALTER TABLE [dbo].[AuditMissionMember] DROP CONSTRAINT [AuditMissionMember_userId_fkey];
ALTER TABLE [dbo].[AuditMissionMember] ALTER COLUMN [userId] INT NULL;
ALTER TABLE [dbo].[AuditMissionMember] ADD CONSTRAINT [AuditMissionMember_userId_fkey]
FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalParticipant_tenantId_isActive_idx]
ON [dbo].[ExternalParticipant]([tenantId], [isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalParticipant_tenantId_fullName_idx]
ON [dbo].[ExternalParticipant]([tenantId], [fullName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionMember_glpiUserId_assignmentStatus_idx]
ON [dbo].[AuditMissionMember]([glpiUserId], [assignmentStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionMember_externalParticipantId_assignmentStatus_idx]
ON [dbo].[AuditMissionMember]([externalParticipantId], [assignmentStatus]);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [AuditMissionMember_missionId_glpiUserId_roleInMission_key]
ON [dbo].[AuditMissionMember]([missionId], [glpiUserId], [roleInMission]);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [AuditMissionMember_missionId_externalParticipantId_roleInMission_key]
ON [dbo].[AuditMissionMember]([missionId], [externalParticipantId], [roleInMission]);

-- AddForeignKey
ALTER TABLE [dbo].[ExternalParticipant] ADD CONSTRAINT [ExternalParticipant_tenantId_fkey]
FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionMember] ADD CONSTRAINT [AuditMissionMember_glpiUserId_fkey]
FOREIGN KEY ([glpiUserId]) REFERENCES [dbo].[GLPIUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionMember] ADD CONSTRAINT [AuditMissionMember_externalParticipantId_fkey]
FOREIGN KEY ([externalParticipantId]) REFERENCES [dbo].[ExternalParticipant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
