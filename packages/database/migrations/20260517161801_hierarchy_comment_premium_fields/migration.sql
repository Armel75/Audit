BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [hierarchyCommentId] INT;

-- CreateTable
CREATE TABLE [dbo].[HierarchyComment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [contextType] NVARCHAR(1000) NOT NULL,
    [contextId] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] VARCHAR(4000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [HierarchyComment_status_df] DEFAULT 'PUBLISHED',
    [updatedById] INT,
    [deletedAt] DATETIME2,
    [isPinned] BIT NOT NULL CONSTRAINT [HierarchyComment_isPinned_df] DEFAULT 0,
    [visibility] NVARCHAR(1000) NOT NULL CONSTRAINT [HierarchyComment_visibility_df] DEFAULT 'PUBLIC',
    [parentCommentId] INT,
    [createdById] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [HierarchyComment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [permissionCode] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [HierarchyComment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HierarchyComment_tenantId_contextType_contextId_idx] ON [dbo].[HierarchyComment]([tenantId], [contextType], [contextId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HierarchyComment_createdById_idx] ON [dbo].[HierarchyComment]([createdById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HierarchyComment_updatedById_idx] ON [dbo].[HierarchyComment]([updatedById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HierarchyComment_permissionCode_idx] ON [dbo].[HierarchyComment]([permissionCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HierarchyComment_visibility_idx] ON [dbo].[HierarchyComment]([visibility]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HierarchyComment_parentCommentId_idx] ON [dbo].[HierarchyComment]([parentCommentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HierarchyComment_deletedAt_idx] ON [dbo].[HierarchyComment]([deletedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_hierarchyCommentId_fkey] FOREIGN KEY ([hierarchyCommentId]) REFERENCES [dbo].[HierarchyComment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HierarchyComment] ADD CONSTRAINT [HierarchyComment_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HierarchyComment] ADD CONSTRAINT [HierarchyComment_updatedById_fkey] FOREIGN KEY ([updatedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HierarchyComment] ADD CONSTRAINT [HierarchyComment_parentCommentId_fkey] FOREIGN KEY ([parentCommentId]) REFERENCES [dbo].[HierarchyComment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HierarchyComment] ADD CONSTRAINT [HierarchyComment_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
