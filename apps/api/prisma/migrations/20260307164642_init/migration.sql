BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[articles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [code_sage_x3] NVARCHAR(1000),
    [code_sage_100] NVARCHAR(1000),
    [designation] NVARCHAR(1000) NOT NULL,
    [planned_quantity] INT,
    [quantity_at_creation] INT,
    [quantity_at_start] INT,
    [current_quantity] INT,
    [quantity_at_closure] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [articles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [articles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[articles] ADD CONSTRAINT [articles_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
