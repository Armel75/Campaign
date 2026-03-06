/*
  Warnings:

  - You are about to drop the column `campaign_id` on the `expenses` table. All the data in the column will be lost.
  - Added the required column `budget_line_id` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[expenses] DROP CONSTRAINT [expenses_campaign_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[campaigns] ADD [budget_plan_id] INT;

-- AlterTable
ALTER TABLE [dbo].[expenses] DROP COLUMN [campaign_id];
ALTER TABLE [dbo].[expenses] ADD [budget_line_id] INT NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[budget_plans] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [budget_plans_status_df] DEFAULT 'DRAFT',
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [budget_plans_currency_df] DEFAULT 'XAF',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [budget_plans_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [budget_plans_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[budget_lines] (
    [id] INT NOT NULL IDENTITY(1,1),
    [budget_plan_id] INT NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [planned_amount] DECIMAL(18,2) NOT NULL,
    [notes] NVARCHAR(1000),
    [order] INT NOT NULL CONSTRAINT [budget_lines_order_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [budget_lines_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [budget_lines_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [budget_lines_budget_plan_id_idx] ON [dbo].[budget_lines]([budget_plan_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [campaigns_budget_plan_id_idx] ON [dbo].[campaigns]([budget_plan_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [expenses_budget_line_id_idx] ON [dbo].[expenses]([budget_line_id]);

-- AddForeignKey
ALTER TABLE [dbo].[budget_lines] ADD CONSTRAINT [budget_lines_budget_plan_id_fkey] FOREIGN KEY ([budget_plan_id]) REFERENCES [dbo].[budget_plans]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaigns] ADD CONSTRAINT [campaigns_budget_plan_id_fkey] FOREIGN KEY ([budget_plan_id]) REFERENCES [dbo].[budget_plans]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[expenses] ADD CONSTRAINT [expenses_budget_line_id_fkey] FOREIGN KEY ([budget_line_id]) REFERENCES [dbo].[budget_lines]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
