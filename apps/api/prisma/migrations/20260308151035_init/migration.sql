BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[roles] ADD [can_assign_tasks] BIT NOT NULL CONSTRAINT [roles_can_assign_tasks_df] DEFAULT 0,
[can_create_campaign] BIT NOT NULL CONSTRAINT [roles_can_create_campaign_df] DEFAULT 0,
[can_delete_all_campaigns] BIT NOT NULL CONSTRAINT [roles_can_delete_all_campaigns_df] DEFAULT 0,
[can_manage_attachments] BIT NOT NULL CONSTRAINT [roles_can_manage_attachments_df] DEFAULT 0,
[can_manage_campaign_articles] BIT NOT NULL CONSTRAINT [roles_can_manage_campaign_articles_df] DEFAULT 0,
[can_manage_roles] BIT NOT NULL CONSTRAINT [roles_can_manage_roles_df] DEFAULT 0,
[can_manage_tasks] BIT NOT NULL CONSTRAINT [roles_can_manage_tasks_df] DEFAULT 0,
[can_manage_users] BIT NOT NULL CONSTRAINT [roles_can_manage_users_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
