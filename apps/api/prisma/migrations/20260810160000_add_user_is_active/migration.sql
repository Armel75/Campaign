-- AlterTable
ALTER TABLE [dbo].[users] ADD [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1;
