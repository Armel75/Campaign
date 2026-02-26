BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [role_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [roles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[campaigns] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [objective_id] NVARCHAR(1000) NOT NULL,
    [start_date] DATETIME2 NOT NULL,
    [end_date] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [created_by] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaigns_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaigns_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[objectives] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [is_active] BIT NOT NULL CONSTRAINT [objectives_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [objectives_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [objectives_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [objectives_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[target_audiences] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [target_audiences_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [target_audiences_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[channels] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [channels_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [channels_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_channels] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000) NOT NULL,
    [channel_id] NVARCHAR(1000) NOT NULL,
    [budget_allocated] DECIMAL(32,16) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_channels_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_channels_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_metrics] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000) NOT NULL,
    [metric_name] NVARCHAR(1000) NOT NULL,
    [metric_value] DECIMAL(32,16) NOT NULL,
    [metric_date] DATETIME2 NOT NULL CONSTRAINT [campaign_metrics_metric_date_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_metrics_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_metrics_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[leads] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [leads_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [leads_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[conversions] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000) NOT NULL,
    [lead_id] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(32,16) NOT NULL,
    [conversion_date] DATETIME2 NOT NULL CONSTRAINT [conversions_conversion_date_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [conversions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [conversions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tasks] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [assigned_to] NVARCHAR(1000),
    [due_date] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tasks_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [tasks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[expenses] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(32,16) NOT NULL,
    [expense_date] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [expenses_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [expenses_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[attachments] (
    [id] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000),
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [attachments_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [attachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_kpi_targets] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaign_id] NVARCHAR(1000) NOT NULL,
    [kpi_name] NVARCHAR(1000) NOT NULL,
    [target_value] DECIMAL(32,16) NOT NULL,
    [period_start] DATETIME2 NOT NULL,
    [period_end] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_kpi_targets_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_kpi_targets_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaigns] ADD CONSTRAINT [campaigns_objective_id_fkey] FOREIGN KEY ([objective_id]) REFERENCES [dbo].[objectives]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaigns] ADD CONSTRAINT [campaigns_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_channels] ADD CONSTRAINT [campaign_channels_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_channels] ADD CONSTRAINT [campaign_channels_channel_id_fkey] FOREIGN KEY ([channel_id]) REFERENCES [dbo].[channels]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_metrics] ADD CONSTRAINT [campaign_metrics_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[leads] ADD CONSTRAINT [leads_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[conversions] ADD CONSTRAINT [conversions_lead_id_fkey] FOREIGN KEY ([lead_id]) REFERENCES [dbo].[leads]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_assigned_to_fkey] FOREIGN KEY ([assigned_to]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[expenses] ADD CONSTRAINT [expenses_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[attachments] ADD CONSTRAINT [attachments_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_kpi_targets] ADD CONSTRAINT [campaign_kpi_targets_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
