BEGIN TRY

BEGIN TRAN;

IF EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE [name] = 'AuditMissionMember_missionId_userId_roleInMission_key'
    AND [parent_object_id] = OBJECT_ID('[dbo].[AuditMissionMember]')
)
BEGIN
  ALTER TABLE [dbo].[AuditMissionMember]
  DROP CONSTRAINT [AuditMissionMember_missionId_userId_roleInMission_key];
END;

IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'AuditMissionMember_missionId_userId_roleInMission_key'
    AND object_id = OBJECT_ID('[dbo].[AuditMissionMember]')
)
BEGIN
  DROP INDEX [AuditMissionMember_missionId_userId_roleInMission_key]
  ON [dbo].[AuditMissionMember];
END;

IF EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE [name] = 'AuditMissionMember_missionId_glpiUserId_roleInMission_key'
    AND [parent_object_id] = OBJECT_ID('[dbo].[AuditMissionMember]')
)
BEGIN
  ALTER TABLE [dbo].[AuditMissionMember]
  DROP CONSTRAINT [AuditMissionMember_missionId_glpiUserId_roleInMission_key];
END;

IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'AuditMissionMember_missionId_glpiUserId_roleInMission_key'
    AND object_id = OBJECT_ID('[dbo].[AuditMissionMember]')
)
BEGIN
  DROP INDEX [AuditMissionMember_missionId_glpiUserId_roleInMission_key]
  ON [dbo].[AuditMissionMember];
END;

IF EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE [name] = 'AuditMissionMember_missionId_externalParticipantId_roleInMission_key'
    AND [parent_object_id] = OBJECT_ID('[dbo].[AuditMissionMember]')
)
BEGIN
  ALTER TABLE [dbo].[AuditMissionMember]
  DROP CONSTRAINT [AuditMissionMember_missionId_externalParticipantId_roleInMission_key];
END;

IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'AuditMissionMember_missionId_externalParticipantId_roleInMission_key'
    AND object_id = OBJECT_ID('[dbo].[AuditMissionMember]')
)
BEGIN
  DROP INDEX [AuditMissionMember_missionId_externalParticipantId_roleInMission_key]
  ON [dbo].[AuditMissionMember];
END;

CREATE UNIQUE NONCLUSTERED INDEX [AuditMissionMember_missionId_userId_roleInMission_unique_not_null]
ON [dbo].[AuditMissionMember]([missionId], [userId], [roleInMission])
WHERE [userId] IS NOT NULL;

CREATE UNIQUE NONCLUSTERED INDEX [AuditMissionMember_missionId_glpiUserId_roleInMission_unique_not_null]
ON [dbo].[AuditMissionMember]([missionId], [glpiUserId], [roleInMission])
WHERE [glpiUserId] IS NOT NULL;

CREATE UNIQUE NONCLUSTERED INDEX [AuditMissionMember_missionId_externalParticipantId_roleInMission_unique_not_null]
ON [dbo].[AuditMissionMember]([missionId], [externalParticipantId], [roleInMission])
WHERE [externalParticipantId] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
