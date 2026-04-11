BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Tenant] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(4000) NOT NULL,
    [code] VARCHAR(255) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Tenant_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Tenant_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2,
    CONSTRAINT [Tenant_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Tenant_name_key] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [Tenant_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [matricule] VARCHAR(255) NOT NULL,
    [email] VARCHAR(255) NOT NULL,
    [passwordHash] VARCHAR(4000) NOT NULL,
    [firstName] VARCHAR(4000) NOT NULL,
    [lastName] VARCHAR(4000) NOT NULL,
    [phone] VARCHAR(255),
    [status] VARCHAR(100) NOT NULL CONSTRAINT [User_status_df] DEFAULT 'PENDING',
    [failedLogins] INT NOT NULL CONSTRAINT [User_failedLogins_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [lastLoginAt] DATETIME2,
    [roleId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_matricule_key] UNIQUE NONCLUSTERED ([matricule]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(255) NOT NULL,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Permission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(255) NOT NULL,
    [description] VARCHAR(4000),
    [isLegacy] BIT NOT NULL CONSTRAINT [Permission_isLegacy_df] DEFAULT 0,
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permission_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[RolePermission] (
    [roleId] INT NOT NULL,
    [permissionId] INT NOT NULL,
    CONSTRAINT [RolePermission_pkey] PRIMARY KEY CLUSTERED ([roleId],[permissionId])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tokenHash] VARCHAR(255) NOT NULL,
    [userId] INT NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [ipAddress] VARCHAR(255),
    [userAgent] VARCHAR(4000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[PasswordResetToken] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tokenHash] VARCHAR(255) NOT NULL,
    [userId] INT NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [used] BIT NOT NULL CONSTRAINT [PasswordResetToken_used_df] DEFAULT 0,
    [usedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PasswordResetToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PasswordResetToken_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PasswordResetToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[Department] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [name] VARCHAR(4000) NOT NULL,
    [code] VARCHAR(255) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Department_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Department_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Department_tenantId_code_key] UNIQUE NONCLUSTERED ([tenantId],[code]),
    CONSTRAINT [Department_tenantId_name_key] UNIQUE NONCLUSTERED ([tenantId],[name])
);

-- CreateTable
CREATE TABLE [dbo].[AuditType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [AuditType_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditType_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AuditType_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditType_tenantId_name_key] UNIQUE NONCLUSTERED ([tenantId],[name]),
    CONSTRAINT [AuditType_tenantId_name_isActive_key] UNIQUE NONCLUSTERED ([tenantId],[name],[isActive])
);

-- CreateTable
CREATE TABLE [dbo].[RiskLevel] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [color] VARCHAR(100),
    [level] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RiskLevel_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RiskLevel_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RiskLevel_tenantId_name_key] UNIQUE NONCLUSTERED ([tenantId],[name]),
    CONSTRAINT [RiskLevel_tenantId_level_key] UNIQUE NONCLUSTERED ([tenantId],[level])
);

-- CreateTable
CREATE TABLE [dbo].[PriorityLevel] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [level] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PriorityLevel_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PriorityLevel_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PriorityLevel_tenantId_name_key] UNIQUE NONCLUSTERED ([tenantId],[name]),
    CONSTRAINT [PriorityLevel_tenantId_level_key] UNIQUE NONCLUSTERED ([tenantId],[level])
);

-- CreateTable
CREATE TABLE [dbo].[GLPIUser] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [glpiId] INT NOT NULL,
    [login] VARCHAR(255),
    [email] VARCHAR(255),
    [firstName] VARCHAR(4000),
    [lastName] VARCHAR(4000),
    [fullName] VARCHAR(4000),
    [phone] VARCHAR(255),
    [departmentName] VARCHAR(4000),
    [entityName] VARCHAR(4000),
    [status] VARCHAR(100) NOT NULL CONSTRAINT [GLPIUser_status_df] DEFAULT 'ACTIVE',
    [isDeletedInSource] BIT NOT NULL CONSTRAINT [GLPIUser_isDeletedInSource_df] DEFAULT 0,
    [sourceUpdatedAt] DATETIME2,
    [lastSyncedAt] DATETIME2,
    [syncStatus] VARCHAR(100) NOT NULL CONSTRAINT [GLPIUser_syncStatus_df] DEFAULT 'SYNCED',
    [rawPayload] VARCHAR(4000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [GLPIUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [GLPIUser_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [GLPIUser_tenantId_glpiId_key] UNIQUE NONCLUSTERED ([tenantId],[glpiId])
);

-- CreateTable
CREATE TABLE [dbo].[Ticket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [glpiId] INT NOT NULL,
    [ticketNumber] VARCHAR(255),
    [title] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000),
    [ticketType] VARCHAR(100),
    [status] VARCHAR(100) NOT NULL CONSTRAINT [Ticket_status_df] DEFAULT 'OPEN',
    [priority] VARCHAR(100),
    [urgency] VARCHAR(100),
    [impact] VARCHAR(100),
    [categoryName] VARCHAR(4000),
    [entityName] VARCHAR(4000),
    [locationName] VARCHAR(4000),
    [openedAt] DATETIME2,
    [dueAt] DATETIME2,
    [resolvedAt] DATETIME2,
    [closedAt] DATETIME2,
    [requesterGlpiUserId] INT,
    [assigneeGlpiUserId] INT,
    [sourceUpdatedAt] DATETIME2,
    [lastSyncedAt] DATETIME2,
    [syncStatus] VARCHAR(100) NOT NULL CONSTRAINT [Ticket_syncStatus_df] DEFAULT 'SYNCED',
    [rawPayload] VARCHAR(4000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Ticket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Ticket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Ticket_tenantId_glpiId_key] UNIQUE NONCLUSTERED ([tenantId],[glpiId])
);

-- CreateTable
CREATE TABLE [dbo].[UserDepartment] (
    [tenantId] INT NOT NULL,
    [userId] INT NOT NULL,
    [departmentId] INT NOT NULL,
    [isPrimary] BIT NOT NULL CONSTRAINT [UserDepartment_isPrimary_df] DEFAULT 0,
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserDepartment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserDepartment_pkey] PRIMARY KEY CLUSTERED ([userId],[departmentId])
);

-- CreateTable
CREATE TABLE [dbo].[AuditableEntity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [parentId] INT,
    [ownerDepartmentId] INT,
    [managerUserId] INT,
    [code] VARCHAR(255) NOT NULL,
    [name] VARCHAR(4000) NOT NULL,
    [entityType] VARCHAR(100) NOT NULL,
    [description] VARCHAR(4000),
    [criticality] VARCHAR(100),
    [isActive] BIT NOT NULL CONSTRAINT [AuditableEntity_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditableEntity_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AuditableEntity_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditableEntity_tenantId_code_key] UNIQUE NONCLUSTERED ([tenantId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[BusinessProcess] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [auditableEntityId] INT,
    [ownerDepartmentId] INT,
    [code] VARCHAR(255) NOT NULL,
    [name] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000),
    [isActive] BIT NOT NULL CONSTRAINT [BusinessProcess_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BusinessProcess_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BusinessProcess_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BusinessProcess_tenantId_code_key] UNIQUE NONCLUSTERED ([tenantId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[Control] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [businessProcessId] INT,
    [ownerDepartmentId] INT,
    [code] VARCHAR(255) NOT NULL,
    [name] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000),
    [controlType] VARCHAR(100),
    [frequency] VARCHAR(100),
    [isKey] BIT NOT NULL CONSTRAINT [Control_isKey_df] DEFAULT 0,
    [isAutomated] BIT NOT NULL CONSTRAINT [Control_isAutomated_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Control_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Control_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Control_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Control_tenantId_code_key] UNIQUE NONCLUSTERED ([tenantId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[Risk] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [businessProcessId] INT,
    [auditableEntityId] INT,
    [ownerDepartmentId] INT,
    [code] VARCHAR(255) NOT NULL,
    [name] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000),
    [category] VARCHAR(100),
    [inherentImpact] INT,
    [inherentLikelihood] INT,
    [isActive] BIT NOT NULL CONSTRAINT [Risk_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Risk_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Risk_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Risk_tenantId_code_key] UNIQUE NONCLUSTERED ([tenantId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[RiskControl] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [riskId] INT NOT NULL,
    [controlId] INT NOT NULL,
    [designEffectiveness] VARCHAR(100),
    [operatingEffectiveness] VARCHAR(100),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RiskControl_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RiskControl_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RiskControl_riskId_controlId_key] UNIQUE NONCLUSTERED ([riskId],[controlId])
);

-- CreateTable
CREATE TABLE [dbo].[AuditPlan] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [year] INT NOT NULL,
    [title] VARCHAR(4000),
    [description] VARCHAR(4000),
    [status] VARCHAR(100) NOT NULL CONSTRAINT [AuditPlan_status_df] DEFAULT 'DRAFT',
    [versionNumber] INT NOT NULL CONSTRAINT [AuditPlan_versionNumber_df] DEFAULT 1,
    [approvedAt] DATETIME2,
    [approvedById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditPlan_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AuditPlan_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditPlan_tenantId_year_key] UNIQUE NONCLUSTERED ([tenantId],[year])
);

-- CreateTable
CREATE TABLE [dbo].[AuditPlanVersion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [planId] INT NOT NULL,
    [versionNumber] INT NOT NULL,
    [label] VARCHAR(255),
    [changeSummary] VARCHAR(4000),
    [snapshotNote] VARCHAR(4000),
    [createdById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditPlanVersion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditPlanVersion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditPlanVersion_planId_versionNumber_key] UNIQUE NONCLUSTERED ([planId],[versionNumber])
);

-- CreateTable
CREATE TABLE [dbo].[AuditPlanStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [planId] INT NOT NULL,
    [previousStatus] VARCHAR(100),
    [newStatus] VARCHAR(100) NOT NULL,
    [reason] VARCHAR(4000),
    [changedById] INT,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [AuditPlanStatusHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditPlanStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditMission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [title] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000) NOT NULL,
    [objective] VARCHAR(4000),
    [scopeDescription] VARCHAR(4000),
    [methodology] VARCHAR(4000),
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [status] VARCHAR(100) NOT NULL CONSTRAINT [AuditMission_status_df] DEFAULT 'PLANNED',
    [planId] INT NOT NULL,
    [auditTypeId] INT,
    [leaderId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditMission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AuditMission_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditMissionMember] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [missionId] INT NOT NULL,
    [userId] INT NOT NULL,
    [roleInMission] VARCHAR(100) NOT NULL,
    [assignmentStatus] VARCHAR(100) NOT NULL CONSTRAINT [AuditMissionMember_assignmentStatus_df] DEFAULT 'ACTIVE',
    [isLead] BIT NOT NULL CONSTRAINT [AuditMissionMember_isLead_df] DEFAULT 0,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [AuditMissionMember_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [removedAt] DATETIME2,
    [notes] VARCHAR(4000),
    CONSTRAINT [AuditMissionMember_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditMissionMember_missionId_userId_roleInMission_key] UNIQUE NONCLUSTERED ([missionId],[userId],[roleInMission])
);

-- CreateTable
CREATE TABLE [dbo].[AuditMissionScope] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [missionId] INT NOT NULL,
    [auditableEntityId] INT NOT NULL,
    [removedById] INT,
    [scopeRole] VARCHAR(100),
    [status] VARCHAR(50) NOT NULL CONSTRAINT [AuditMissionScope_status_df] DEFAULT 'IN_SCOPE',
    [criticality] VARCHAR(50),
    [addedById] INT,
    [removedAt] DATETIME2,
    [removalReason] VARCHAR(4000),
    [notes] VARCHAR(4000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditMissionScope_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [AuditMissionScope_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditMissionScope_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditMissionScope_tenantId_missionId_auditableEntityId_key] UNIQUE NONCLUSTERED ([tenantId],[missionId],[auditableEntityId])
);

-- CreateTable
CREATE TABLE [dbo].[AuditProgram] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [missionId] INT NOT NULL,
    [code] VARCHAR(255) NOT NULL,
    [title] VARCHAR(4000) NOT NULL,
    [programType] VARCHAR(100) NOT NULL,
    [objective] VARCHAR(4000),
    [scopeDescription] VARCHAR(4000),
    [plannedStartDate] DATETIME2,
    [plannedEndDate] DATETIME2,
    [progressPercent] INT NOT NULL CONSTRAINT [AuditProgram_progressPercent_df] DEFAULT 0,
    [status] VARCHAR(100) NOT NULL CONSTRAINT [AuditProgram_status_df] DEFAULT 'DRAFT',
    [isLocked] BIT NOT NULL CONSTRAINT [AuditProgram_isLocked_df] DEFAULT 0,
    [lockedAt] DATETIME2,
    [preparedById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditProgram_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AuditProgram_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditProgram_tenantId_code_key] UNIQUE NONCLUSTERED ([tenantId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[AuditProgramVersion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [programId] INT NOT NULL,
    [versionNumber] INT NOT NULL,
    [label] VARCHAR(255),
    [snapshot] VARCHAR(4000) NOT NULL,
    [changeSummary] VARCHAR(4000),
    [createdById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditProgramVersion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditProgramVersion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditProgramVersion_programId_versionNumber_key] UNIQUE NONCLUSTERED ([programId],[versionNumber])
);

-- CreateTable
CREATE TABLE [dbo].[AuditProgramStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [programId] INT NOT NULL,
    [previousStatus] VARCHAR(100),
    [newStatus] VARCHAR(100) NOT NULL,
    [reason] VARCHAR(4000),
    [changedById] INT,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [AuditProgramStatusHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditProgramStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditProgramScope] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [programId] INT NOT NULL,
    [auditableEntityId] INT,
    [businessProcessId] INT,
    [riskId] INT,
    [coverageLevel] VARCHAR(100),
    [priority] VARCHAR(100),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditProgramScope_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditProgramScope_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditCriteria] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [programId] INT NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [description] VARCHAR(4000),
    [source] VARCHAR(255),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditCriteria_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditCriteria_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditProcedure] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [programId] INT NOT NULL,
    [programVersionId] INT NOT NULL,
    [sequenceNo] INT NOT NULL,
    [code] VARCHAR(255),
    [title] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000),
    [procedureType] VARCHAR(100),
    [dueDate] DATETIME2,
    [priorityId] INT,
    [controlId] INT,
    [riskId] INT,
    [businessProcessId] INT,
    [expectedEvidence] VARCHAR(4000),
    [status] VARCHAR(100) NOT NULL CONSTRAINT [AuditProcedure_status_df] DEFAULT 'PLANNED',
    [plannedAt] DATETIME2,
    [startedAt] DATETIME2,
    [completedAt] DATETIME2,
    [assignedToId] INT,
    [performedById] INT,
    [reviewedById] INT,
    [reviewStatus] VARCHAR(100),
    [reviewComment] VARCHAR(4000),
    [reviewedAt] DATETIME2,
    [result] VARCHAR(100),
    [issueDetected] BIT NOT NULL CONSTRAINT [AuditProcedure_issueDetected_df] DEFAULT 0,
    [severity] VARCHAR(100),
    [reworkCount] INT NOT NULL CONSTRAINT [AuditProcedure_reworkCount_df] DEFAULT 0,
    [snapshot] VARCHAR(4000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditProcedure_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AuditProcedure_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuditProcedure_programId_sequenceNo_key] UNIQUE NONCLUSTERED ([programId],[sequenceNo])
);

-- CreateTable
CREATE TABLE [dbo].[Finding] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [title] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000) NOT NULL,
    [criteria] VARCHAR(4000),
    [riskLevelId] INT,
    [riskLevelLegacy] VARCHAR(4000),
    [residualRiskLevelId] INT,
    [procedureId] INT,
    [process] VARCHAR(4000),
    [cause] VARCHAR(4000),
    [impact] VARCHAR(4000),
    [managementResponse] VARCHAR(4000),
    [severityScore] INT,
    [riskId] INT,
    [businessProcessId] INT,
    [controlId] INT,
    [status] VARCHAR(100) NOT NULL CONSTRAINT [Finding_status_df] DEFAULT 'DRAFT',
    [authorId] INT,
    [validatorId] INT,
    [missionId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Finding_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Finding_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FindingComment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [content] VARCHAR(4000) NOT NULL,
    [findingId] INT NOT NULL,
    [authorId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FindingComment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [FindingComment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FindingStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [findingId] INT NOT NULL,
    [previousStatus] VARCHAR(100),
    [newStatus] VARCHAR(100) NOT NULL,
    [reason] VARCHAR(4000),
    [changedById] INT,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [FindingStatusHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FindingStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Recommendation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [title] VARCHAR(4000) NOT NULL,
    [actionPlan] VARCHAR(4000) NOT NULL,
    [targetDate] DATETIME2 NOT NULL,
    [revisedTargetDate] DATETIME2,
    [status] VARCHAR(100) NOT NULL CONSTRAINT [Recommendation_status_df] DEFAULT 'OPEN',
    [implementedPercent] INT NOT NULL CONSTRAINT [Recommendation_implementedPercent_df] DEFAULT 0,
    [closedAt] DATETIME2,
    [validatedAt] DATETIME2,
    [priorityId] INT,
    [departmentId] INT,
    [assigneeName] VARCHAR(4000),
    [assigneeUserId] INT,
    [assigneeGlpiUserId] INT,
    [validatedById] INT,
    [findingId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Recommendation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Recommendation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RecommendationComment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [content] VARCHAR(4000) NOT NULL,
    [recommendationId] INT NOT NULL,
    [authorId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RecommendationComment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RecommendationComment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RecommendationStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [recommendationId] INT NOT NULL,
    [previousStatus] VARCHAR(100),
    [newStatus] VARCHAR(100) NOT NULL,
    [reason] VARCHAR(4000),
    [changedById] INT,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [RecommendationStatusHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RecommendationStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RecommendationFollowUp] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [recommendationId] INT NOT NULL,
    [statusSnapshot] VARCHAR(100),
    [progressPercent] INT NOT NULL CONSTRAINT [RecommendationFollowUp_progressPercent_df] DEFAULT 0,
    [comment] VARCHAR(4000) NOT NULL,
    [evidenceSummary] VARCHAR(4000),
    [nextAction] VARCHAR(4000),
    [nextDueDate] DATETIME2,
    [authorId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RecommendationFollowUp_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RecommendationFollowUp_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RecommendationTicket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [recommendationId] INT NOT NULL,
    [ticketId] INT NOT NULL,
    [linkType] VARCHAR(100) NOT NULL CONSTRAINT [RecommendationTicket_linkType_df] DEFAULT 'RELATED',
    [note] VARCHAR(4000),
    [linkedByUserId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RecommendationTicket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RecommendationTicket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RecommendationTicket_recommendationId_ticketId_key] UNIQUE NONCLUSTERED ([recommendationId],[ticketId])
);

-- CreateTable
CREATE TABLE [dbo].[MissionStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [missionId] INT NOT NULL,
    [previousStatus] VARCHAR(100),
    [newStatus] VARCHAR(100) NOT NULL,
    [reason] VARCHAR(4000),
    [actionType] VARCHAR(500),
    [changedById] INT,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [MissionStatusHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MissionStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Document] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [originalName] VARCHAR(4000) NOT NULL,
    [mimeType] VARCHAR(255) NOT NULL,
    [sizeBytes] INT NOT NULL,
    [storagePath] VARCHAR(4000) NOT NULL,
    [fileHash] VARCHAR(255) NOT NULL,
    [isGenerated] BIT NOT NULL CONSTRAINT [Document_isGenerated_df] DEFAULT 0,
    [missionId] INT,
    [findingId] INT,
    [recommendationId] INT,
    [procedureId] INT,
    [uploadedById] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Document_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [deletedAt] DATETIME2,
    CONSTRAINT [Document_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Evidence] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [title] VARCHAR(4000) NOT NULL,
    [description] VARCHAR(4000),
    [evidenceType] VARCHAR(100) NOT NULL,
    [source] VARCHAR(4000),
    [collectionDate] DATETIME2,
    [chainOfCustodyNote] VARCHAR(4000),
    [isSensitive] BIT NOT NULL CONSTRAINT [Evidence_isSensitive_df] DEFAULT 0,
    [documentId] INT,
    [missionId] INT,
    [findingId] INT,
    [recommendationId] INT,
    [procedureId] INT,
    [collectedById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Evidence_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Evidence_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Approval] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [approvalType] VARCHAR(100) NOT NULL,
    [level] INT NOT NULL CONSTRAINT [Approval_level_df] DEFAULT 1,
    [decision] VARCHAR(100) NOT NULL CONSTRAINT [Approval_decision_df] DEFAULT 'PENDING',
    [comments] VARCHAR(4000),
    [requestedById] INT,
    [approverId] INT,
    [decidedAt] DATETIME2,
    [planId] INT,
    [missionId] INT,
    [findingId] INT,
    [recommendationId] INT,
    [auditProgramVersionId] INT,
    [auditProgramId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Approval_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Approval_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [recipientUserId] INT NOT NULL,
    [title] VARCHAR(4000) NOT NULL,
    [message] VARCHAR(4000) NOT NULL,
    [notificationType] VARCHAR(100) NOT NULL,
    [channel] VARCHAR(100) NOT NULL CONSTRAINT [Notification_channel_df] DEFAULT 'IN_APP',
    [status] VARCHAR(100) NOT NULL CONSTRAINT [Notification_status_df] DEFAULT 'PENDING',
    [readAt] DATETIME2,
    [sentAt] DATETIME2,
    [planId] INT,
    [missionId] INT,
    [findingId] INT,
    [recommendationId] INT,
    [auditProgramId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [action] VARCHAR(4000) NOT NULL,
    [entityName] VARCHAR(255),
    [entityId] VARCHAR(255),
    [oldValues] VARCHAR(4000),
    [newValues] VARCHAR(4000),
    [userId] INT,
    [ipAddress] VARCHAR(255),
    [userAgent] VARCHAR(4000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DashboardSnapshot] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [year] INT,
    [month] INT,
    [data] VARCHAR(4000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DashboardSnapshot_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [DashboardSnapshot_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_tenantId_status_idx] ON [dbo].[User]([tenantId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_roleId_idx] ON [dbo].[User]([roleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshToken_userId_expiresAt_idx] ON [dbo].[RefreshToken]([userId], [expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PasswordResetToken_userId_expiresAt_idx] ON [dbo].[PasswordResetToken]([userId], [expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PasswordResetToken_tokenHash_idx] ON [dbo].[PasswordResetToken]([tokenHash]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditType_tenantId_name_idx] ON [dbo].[AuditType]([tenantId], [name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RiskLevel_tenantId_level_idx] ON [dbo].[RiskLevel]([tenantId], [level]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PriorityLevel_tenantId_level_idx] ON [dbo].[PriorityLevel]([tenantId], [level]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLPIUser_tenantId_email_idx] ON [dbo].[GLPIUser]([tenantId], [email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLPIUser_tenantId_login_idx] ON [dbo].[GLPIUser]([tenantId], [login]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLPIUser_tenantId_status_idx] ON [dbo].[GLPIUser]([tenantId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_tenantId_status_idx] ON [dbo].[Ticket]([tenantId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_tenantId_ticketNumber_idx] ON [dbo].[Ticket]([tenantId], [ticketNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_requesterGlpiUserId_idx] ON [dbo].[Ticket]([requesterGlpiUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_assigneeGlpiUserId_idx] ON [dbo].[Ticket]([assigneeGlpiUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserDepartment_tenantId_departmentId_idx] ON [dbo].[UserDepartment]([tenantId], [departmentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditableEntity_tenantId_entityType_idx] ON [dbo].[AuditableEntity]([tenantId], [entityType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditableEntity_parentId_idx] ON [dbo].[AuditableEntity]([parentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessProcess_tenantId_name_idx] ON [dbo].[BusinessProcess]([tenantId], [name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessProcess_auditableEntityId_idx] ON [dbo].[BusinessProcess]([auditableEntityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Control_businessProcessId_idx] ON [dbo].[Control]([businessProcessId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Risk_businessProcessId_idx] ON [dbo].[Risk]([businessProcessId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Risk_auditableEntityId_idx] ON [dbo].[Risk]([auditableEntityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RiskControl_tenantId_idx] ON [dbo].[RiskControl]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditPlan_tenantId_status_idx] ON [dbo].[AuditPlan]([tenantId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditPlanVersion_tenantId_createdAt_idx] ON [dbo].[AuditPlanVersion]([tenantId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditPlanStatusHistory_tenantId_planId_changedAt_idx] ON [dbo].[AuditPlanStatusHistory]([tenantId], [planId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMission_tenantId_status_idx] ON [dbo].[AuditMission]([tenantId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMission_planId_idx] ON [dbo].[AuditMission]([planId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMission_leaderId_idx] ON [dbo].[AuditMission]([leaderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionMember_tenantId_missionId_idx] ON [dbo].[AuditMissionMember]([tenantId], [missionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionMember_userId_assignmentStatus_idx] ON [dbo].[AuditMissionMember]([userId], [assignmentStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionScope_tenantId_missionId_idx] ON [dbo].[AuditMissionScope]([tenantId], [missionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionScope_auditableEntityId_idx] ON [dbo].[AuditMissionScope]([auditableEntityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditMissionScope_status_idx] ON [dbo].[AuditMissionScope]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgram_tenantId_status_idx] ON [dbo].[AuditProgram]([tenantId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgram_missionId_idx] ON [dbo].[AuditProgram]([missionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgram_tenantId_missionId_idx] ON [dbo].[AuditProgram]([tenantId], [missionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgramVersion_tenantId_programId_idx] ON [dbo].[AuditProgramVersion]([tenantId], [programId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgramStatusHistory_tenantId_programId_changedAt_idx] ON [dbo].[AuditProgramStatusHistory]([tenantId], [programId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgramScope_tenantId_programId_idx] ON [dbo].[AuditProgramScope]([tenantId], [programId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgramScope_auditableEntityId_idx] ON [dbo].[AuditProgramScope]([auditableEntityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgramScope_businessProcessId_idx] ON [dbo].[AuditProgramScope]([businessProcessId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditProgramScope_riskId_idx] ON [dbo].[AuditProgramScope]([riskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditCriteria_tenantId_programId_idx] ON [dbo].[AuditCriteria]([tenantId], [programId]);

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
CREATE NONCLUSTERED INDEX [Finding_missionId_idx] ON [dbo].[Finding]([missionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Finding_tenantId_status_idx] ON [dbo].[Finding]([tenantId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Finding_riskId_idx] ON [dbo].[Finding]([riskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Finding_businessProcessId_idx] ON [dbo].[Finding]([businessProcessId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Finding_controlId_idx] ON [dbo].[Finding]([controlId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Finding_procedureId_idx] ON [dbo].[Finding]([procedureId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FindingComment_findingId_createdAt_idx] ON [dbo].[FindingComment]([findingId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FindingStatusHistory_tenantId_findingId_changedAt_idx] ON [dbo].[FindingStatusHistory]([tenantId], [findingId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Recommendation_findingId_idx] ON [dbo].[Recommendation]([findingId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Recommendation_tenantId_status_targetDate_idx] ON [dbo].[Recommendation]([tenantId], [status], [targetDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Recommendation_assigneeUserId_idx] ON [dbo].[Recommendation]([assigneeUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Recommendation_assigneeGlpiUserId_idx] ON [dbo].[Recommendation]([assigneeGlpiUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RecommendationComment_recommendationId_createdAt_idx] ON [dbo].[RecommendationComment]([recommendationId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RecommendationStatusHistory_tenantId_recommendationId_changedAt_idx] ON [dbo].[RecommendationStatusHistory]([tenantId], [recommendationId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RecommendationFollowUp_tenantId_recommendationId_createdAt_idx] ON [dbo].[RecommendationFollowUp]([tenantId], [recommendationId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RecommendationTicket_tenantId_ticketId_idx] ON [dbo].[RecommendationTicket]([tenantId], [ticketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MissionStatusHistory_tenantId_missionId_changedAt_idx] ON [dbo].[MissionStatusHistory]([tenantId], [missionId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_tenantId_createdAt_idx] ON [dbo].[Document]([tenantId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_missionId_idx] ON [dbo].[Document]([missionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_findingId_idx] ON [dbo].[Document]([findingId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_recommendationId_idx] ON [dbo].[Document]([recommendationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_procedureId_idx] ON [dbo].[Document]([procedureId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Evidence_tenantId_evidenceType_idx] ON [dbo].[Evidence]([tenantId], [evidenceType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Evidence_findingId_idx] ON [dbo].[Evidence]([findingId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Evidence_recommendationId_idx] ON [dbo].[Evidence]([recommendationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Evidence_procedureId_idx] ON [dbo].[Evidence]([procedureId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approval_tenantId_decision_idx] ON [dbo].[Approval]([tenantId], [decision]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approval_approverId_decision_idx] ON [dbo].[Approval]([approverId], [decision]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_tenantId_recipientUserId_status_idx] ON [dbo].[Notification]([tenantId], [recipientUserId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_readAt_idx] ON [dbo].[Notification]([readAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_tenantId_entityName_entityId_idx] ON [dbo].[AuditLog]([tenantId], [entityName], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DashboardSnapshot_tenantId_year_month_idx] ON [dbo].[DashboardSnapshot]([tenantId], [year], [month]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[Permission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PasswordResetToken] ADD CONSTRAINT [PasswordResetToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Department] ADD CONSTRAINT [Department_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditType] ADD CONSTRAINT [AuditType_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RiskLevel] ADD CONSTRAINT [RiskLevel_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PriorityLevel] ADD CONSTRAINT [PriorityLevel_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GLPIUser] ADD CONSTRAINT [GLPIUser_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_requesterGlpiUserId_fkey] FOREIGN KEY ([requesterGlpiUserId]) REFERENCES [dbo].[GLPIUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_assigneeGlpiUserId_fkey] FOREIGN KEY ([assigneeGlpiUserId]) REFERENCES [dbo].[GLPIUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserDepartment] ADD CONSTRAINT [UserDepartment_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserDepartment] ADD CONSTRAINT [UserDepartment_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserDepartment] ADD CONSTRAINT [UserDepartment_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditableEntity] ADD CONSTRAINT [AuditableEntity_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditableEntity] ADD CONSTRAINT [AuditableEntity_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[AuditableEntity]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditableEntity] ADD CONSTRAINT [AuditableEntity_ownerDepartmentId_fkey] FOREIGN KEY ([ownerDepartmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditableEntity] ADD CONSTRAINT [AuditableEntity_managerUserId_fkey] FOREIGN KEY ([managerUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessProcess] ADD CONSTRAINT [BusinessProcess_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessProcess] ADD CONSTRAINT [BusinessProcess_auditableEntityId_fkey] FOREIGN KEY ([auditableEntityId]) REFERENCES [dbo].[AuditableEntity]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessProcess] ADD CONSTRAINT [BusinessProcess_ownerDepartmentId_fkey] FOREIGN KEY ([ownerDepartmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Control] ADD CONSTRAINT [Control_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Control] ADD CONSTRAINT [Control_businessProcessId_fkey] FOREIGN KEY ([businessProcessId]) REFERENCES [dbo].[BusinessProcess]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Control] ADD CONSTRAINT [Control_ownerDepartmentId_fkey] FOREIGN KEY ([ownerDepartmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Risk] ADD CONSTRAINT [Risk_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Risk] ADD CONSTRAINT [Risk_businessProcessId_fkey] FOREIGN KEY ([businessProcessId]) REFERENCES [dbo].[BusinessProcess]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Risk] ADD CONSTRAINT [Risk_auditableEntityId_fkey] FOREIGN KEY ([auditableEntityId]) REFERENCES [dbo].[AuditableEntity]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Risk] ADD CONSTRAINT [Risk_ownerDepartmentId_fkey] FOREIGN KEY ([ownerDepartmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RiskControl] ADD CONSTRAINT [RiskControl_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RiskControl] ADD CONSTRAINT [RiskControl_riskId_fkey] FOREIGN KEY ([riskId]) REFERENCES [dbo].[Risk]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RiskControl] ADD CONSTRAINT [RiskControl_controlId_fkey] FOREIGN KEY ([controlId]) REFERENCES [dbo].[Control]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlan] ADD CONSTRAINT [AuditPlan_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlan] ADD CONSTRAINT [AuditPlan_approvedById_fkey] FOREIGN KEY ([approvedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlanVersion] ADD CONSTRAINT [AuditPlanVersion_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlanVersion] ADD CONSTRAINT [AuditPlanVersion_planId_fkey] FOREIGN KEY ([planId]) REFERENCES [dbo].[AuditPlan]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlanVersion] ADD CONSTRAINT [AuditPlanVersion_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlanStatusHistory] ADD CONSTRAINT [AuditPlanStatusHistory_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlanStatusHistory] ADD CONSTRAINT [AuditPlanStatusHistory_planId_fkey] FOREIGN KEY ([planId]) REFERENCES [dbo].[AuditPlan]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditPlanStatusHistory] ADD CONSTRAINT [AuditPlanStatusHistory_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMission] ADD CONSTRAINT [AuditMission_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMission] ADD CONSTRAINT [AuditMission_planId_fkey] FOREIGN KEY ([planId]) REFERENCES [dbo].[AuditPlan]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMission] ADD CONSTRAINT [AuditMission_auditTypeId_fkey] FOREIGN KEY ([auditTypeId]) REFERENCES [dbo].[AuditType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMission] ADD CONSTRAINT [AuditMission_leaderId_fkey] FOREIGN KEY ([leaderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionMember] ADD CONSTRAINT [AuditMissionMember_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionMember] ADD CONSTRAINT [AuditMissionMember_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionMember] ADD CONSTRAINT [AuditMissionMember_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionScope] ADD CONSTRAINT [AuditMissionScope_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionScope] ADD CONSTRAINT [AuditMissionScope_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionScope] ADD CONSTRAINT [AuditMissionScope_auditableEntityId_fkey] FOREIGN KEY ([auditableEntityId]) REFERENCES [dbo].[AuditableEntity]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionScope] ADD CONSTRAINT [AuditMissionScope_removedById_fkey] FOREIGN KEY ([removedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditMissionScope] ADD CONSTRAINT [AuditMissionScope_addedById_fkey] FOREIGN KEY ([addedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgram] ADD CONSTRAINT [AuditProgram_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgram] ADD CONSTRAINT [AuditProgram_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgram] ADD CONSTRAINT [AuditProgram_preparedById_fkey] FOREIGN KEY ([preparedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramVersion] ADD CONSTRAINT [AuditProgramVersion_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramVersion] ADD CONSTRAINT [AuditProgramVersion_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[AuditProgram]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramVersion] ADD CONSTRAINT [AuditProgramVersion_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramStatusHistory] ADD CONSTRAINT [AuditProgramStatusHistory_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramStatusHistory] ADD CONSTRAINT [AuditProgramStatusHistory_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[AuditProgram]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramStatusHistory] ADD CONSTRAINT [AuditProgramStatusHistory_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramScope] ADD CONSTRAINT [AuditProgramScope_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramScope] ADD CONSTRAINT [AuditProgramScope_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[AuditProgram]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramScope] ADD CONSTRAINT [AuditProgramScope_auditableEntityId_fkey] FOREIGN KEY ([auditableEntityId]) REFERENCES [dbo].[AuditableEntity]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramScope] ADD CONSTRAINT [AuditProgramScope_businessProcessId_fkey] FOREIGN KEY ([businessProcessId]) REFERENCES [dbo].[BusinessProcess]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProgramScope] ADD CONSTRAINT [AuditProgramScope_riskId_fkey] FOREIGN KEY ([riskId]) REFERENCES [dbo].[Risk]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditCriteria] ADD CONSTRAINT [AuditCriteria_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditCriteria] ADD CONSTRAINT [AuditCriteria_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[AuditProgram]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

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
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_performedById_fkey] FOREIGN KEY ([performedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditProcedure] ADD CONSTRAINT [AuditProcedure_reviewedById_fkey] FOREIGN KEY ([reviewedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_riskLevelId_fkey] FOREIGN KEY ([riskLevelId]) REFERENCES [dbo].[RiskLevel]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_residualRiskLevelId_fkey] FOREIGN KEY ([residualRiskLevelId]) REFERENCES [dbo].[RiskLevel]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[AuditProcedure]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_riskId_fkey] FOREIGN KEY ([riskId]) REFERENCES [dbo].[Risk]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_businessProcessId_fkey] FOREIGN KEY ([businessProcessId]) REFERENCES [dbo].[BusinessProcess]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_controlId_fkey] FOREIGN KEY ([controlId]) REFERENCES [dbo].[Control]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_validatorId_fkey] FOREIGN KEY ([validatorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Finding] ADD CONSTRAINT [Finding_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FindingComment] ADD CONSTRAINT [FindingComment_findingId_fkey] FOREIGN KEY ([findingId]) REFERENCES [dbo].[Finding]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[FindingComment] ADD CONSTRAINT [FindingComment_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FindingStatusHistory] ADD CONSTRAINT [FindingStatusHistory_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FindingStatusHistory] ADD CONSTRAINT [FindingStatusHistory_findingId_fkey] FOREIGN KEY ([findingId]) REFERENCES [dbo].[Finding]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[FindingStatusHistory] ADD CONSTRAINT [FindingStatusHistory_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recommendation] ADD CONSTRAINT [Recommendation_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recommendation] ADD CONSTRAINT [Recommendation_priorityId_fkey] FOREIGN KEY ([priorityId]) REFERENCES [dbo].[PriorityLevel]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recommendation] ADD CONSTRAINT [Recommendation_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recommendation] ADD CONSTRAINT [Recommendation_assigneeUserId_fkey] FOREIGN KEY ([assigneeUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recommendation] ADD CONSTRAINT [Recommendation_assigneeGlpiUserId_fkey] FOREIGN KEY ([assigneeGlpiUserId]) REFERENCES [dbo].[GLPIUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recommendation] ADD CONSTRAINT [Recommendation_validatedById_fkey] FOREIGN KEY ([validatedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recommendation] ADD CONSTRAINT [Recommendation_findingId_fkey] FOREIGN KEY ([findingId]) REFERENCES [dbo].[Finding]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationComment] ADD CONSTRAINT [RecommendationComment_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationComment] ADD CONSTRAINT [RecommendationComment_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationStatusHistory] ADD CONSTRAINT [RecommendationStatusHistory_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationStatusHistory] ADD CONSTRAINT [RecommendationStatusHistory_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationStatusHistory] ADD CONSTRAINT [RecommendationStatusHistory_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationFollowUp] ADD CONSTRAINT [RecommendationFollowUp_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationFollowUp] ADD CONSTRAINT [RecommendationFollowUp_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationFollowUp] ADD CONSTRAINT [RecommendationFollowUp_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationTicket] ADD CONSTRAINT [RecommendationTicket_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationTicket] ADD CONSTRAINT [RecommendationTicket_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationTicket] ADD CONSTRAINT [RecommendationTicket_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationTicket] ADD CONSTRAINT [RecommendationTicket_linkedByUserId_fkey] FOREIGN KEY ([linkedByUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MissionStatusHistory] ADD CONSTRAINT [MissionStatusHistory_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MissionStatusHistory] ADD CONSTRAINT [MissionStatusHistory_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MissionStatusHistory] ADD CONSTRAINT [MissionStatusHistory_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_findingId_fkey] FOREIGN KEY ([findingId]) REFERENCES [dbo].[Finding]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[AuditProcedure]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_uploadedById_fkey] FOREIGN KEY ([uploadedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_findingId_fkey] FOREIGN KEY ([findingId]) REFERENCES [dbo].[Finding]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[AuditProcedure]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_collectedById_fkey] FOREIGN KEY ([collectedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_requestedById_fkey] FOREIGN KEY ([requestedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_approverId_fkey] FOREIGN KEY ([approverId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_planId_fkey] FOREIGN KEY ([planId]) REFERENCES [dbo].[AuditPlan]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_findingId_fkey] FOREIGN KEY ([findingId]) REFERENCES [dbo].[Finding]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_auditProgramVersionId_fkey] FOREIGN KEY ([auditProgramVersionId]) REFERENCES [dbo].[AuditProgramVersion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [Approval_auditProgramId_fkey] FOREIGN KEY ([auditProgramId]) REFERENCES [dbo].[AuditProgram]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_recipientUserId_fkey] FOREIGN KEY ([recipientUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_planId_fkey] FOREIGN KEY ([planId]) REFERENCES [dbo].[AuditPlan]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_missionId_fkey] FOREIGN KEY ([missionId]) REFERENCES [dbo].[AuditMission]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_findingId_fkey] FOREIGN KEY ([findingId]) REFERENCES [dbo].[Finding]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_recommendationId_fkey] FOREIGN KEY ([recommendationId]) REFERENCES [dbo].[Recommendation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_auditProgramId_fkey] FOREIGN KEY ([auditProgramId]) REFERENCES [dbo].[AuditProgram]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DashboardSnapshot] ADD CONSTRAINT [DashboardSnapshot_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
