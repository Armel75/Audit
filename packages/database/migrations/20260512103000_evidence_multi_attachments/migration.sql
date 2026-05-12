BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[EvidenceDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenantId] INT NOT NULL,
    [evidenceId] INT NOT NULL,
    [documentId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EvidenceDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EvidenceDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [EvidenceDocument_evidenceId_documentId_key] ON [dbo].[EvidenceDocument]([evidenceId], [documentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EvidenceDocument_tenantId_evidenceId_idx] ON [dbo].[EvidenceDocument]([tenantId], [evidenceId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EvidenceDocument_documentId_idx] ON [dbo].[EvidenceDocument]([documentId]);

-- AddForeignKey
ALTER TABLE [dbo].[EvidenceDocument] ADD CONSTRAINT [EvidenceDocument_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EvidenceDocument] ADD CONSTRAINT [EvidenceDocument_evidenceId_fkey] FOREIGN KEY ([evidenceId]) REFERENCES [dbo].[Evidence]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EvidenceDocument] ADD CONSTRAINT [EvidenceDocument_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
