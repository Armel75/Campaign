BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[roles] ADD [can_view_strategic_dashboard] BIT NOT NULL CONSTRAINT [roles_can_view_strategic_dashboard_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
