-- Migration: make Approval.auditProgramVersionId nullable
-- Reason: non-program approvals (plan, mission, finding, recommendation)
-- do not have an associated audit program version.

ALTER TABLE [dbo].[Approval] ALTER COLUMN [auditProgramVersionId] INT NULL;
