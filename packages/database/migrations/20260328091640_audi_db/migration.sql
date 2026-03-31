BEGIN TRY

BEGIN TRAN;

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
CREATE NONCLUSTERED INDEX [DashboardSnapshot_tenantId_year_month_idx] ON [dbo].[DashboardSnapshot]([tenantId], [year], [month]);

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
