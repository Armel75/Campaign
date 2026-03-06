BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[conversions] DROP CONSTRAINT [conversions_lead_id_fkey];

-- CreateTable
CREATE TABLE [dbo].[campaign_target_audiences] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [target_audience_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_target_audiences_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_target_audiences_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[conversions] ADD CONSTRAINT [conversions_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversions] ADD CONSTRAINT [conversions_lead_id_fkey] FOREIGN KEY ([lead_id]) REFERENCES [dbo].[leads]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_target_audiences] ADD CONSTRAINT [campaign_target_audiences_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_target_audiences] ADD CONSTRAINT [campaign_target_audiences_target_audience_id_fkey] FOREIGN KEY ([target_audience_id]) REFERENCES [dbo].[target_audiences]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
