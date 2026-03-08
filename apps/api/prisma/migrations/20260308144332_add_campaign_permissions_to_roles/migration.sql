/*
  Warnings:

  - Added the required column `created_by` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `budget_lines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `budget_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `campaign_kpi_targets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `campaign_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `conversions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `leads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `objectives` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `target_audiences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[campaigns] DROP CONSTRAINT [campaigns_created_by_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[users] DROP CONSTRAINT [users_role_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[articles] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[attachments] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[budget_lines] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[budget_plans] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[campaign_kpi_targets] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[campaign_metrics] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[channels] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[conversions] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[expenses] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[leads] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[objectives] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[roles] ADD [can_edit_all_campaigns] BIT NOT NULL CONSTRAINT [roles_can_edit_all_campaigns_df] DEFAULT 0,
[can_view_all_campaigns] BIT NOT NULL CONSTRAINT [roles_can_view_all_campaigns_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[target_audiences] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[tasks] ADD [created_by] INT NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[budget_plans] ADD CONSTRAINT [budget_plans_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[budget_lines] ADD CONSTRAINT [budget_lines_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[campaigns] ADD CONSTRAINT [campaigns_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[objectives] ADD CONSTRAINT [objectives_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[target_audiences] ADD CONSTRAINT [target_audiences_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[channels] ADD CONSTRAINT [channels_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_metrics] ADD CONSTRAINT [campaign_metrics_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[leads] ADD CONSTRAINT [leads_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversions] ADD CONSTRAINT [conversions_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[expenses] ADD CONSTRAINT [expenses_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[attachments] ADD CONSTRAINT [attachments_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_kpi_targets] ADD CONSTRAINT [campaign_kpi_targets_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[articles] ADD CONSTRAINT [articles_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
