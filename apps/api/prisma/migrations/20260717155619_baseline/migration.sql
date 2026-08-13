BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [matricule] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [role_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_matricule_key] UNIQUE NONCLUSTERED ([matricule]),
    CONSTRAINT [users_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [can_view_all_campaigns] BIT NOT NULL CONSTRAINT [roles_can_view_all_campaigns_df] DEFAULT 0,
    [can_edit_all_campaigns] BIT NOT NULL CONSTRAINT [roles_can_edit_all_campaigns_df] DEFAULT 0,
    [can_delete_all_campaigns] BIT NOT NULL CONSTRAINT [roles_can_delete_all_campaigns_df] DEFAULT 0,
    [can_create_campaign] BIT NOT NULL CONSTRAINT [roles_can_create_campaign_df] DEFAULT 0,
    [can_manage_tasks] BIT NOT NULL CONSTRAINT [roles_can_manage_tasks_df] DEFAULT 0,
    [can_assign_tasks] BIT NOT NULL CONSTRAINT [roles_can_assign_tasks_df] DEFAULT 0,
    [can_manage_campaign_articles] BIT NOT NULL CONSTRAINT [roles_can_manage_campaign_articles_df] DEFAULT 0,
    [can_manage_attachments] BIT NOT NULL CONSTRAINT [roles_can_manage_attachments_df] DEFAULT 0,
    [can_manage_users] BIT NOT NULL CONSTRAINT [roles_can_manage_users_df] DEFAULT 0,
    [can_manage_roles] BIT NOT NULL CONSTRAINT [roles_can_manage_roles_df] DEFAULT 0,
    [can_export_campaign] BIT NOT NULL CONSTRAINT [roles_can_export_campaign_df] DEFAULT 0,
    [can_view_objectives] BIT NOT NULL CONSTRAINT [roles_can_view_objectives_df] DEFAULT 0,
    [can_view_leads] BIT NOT NULL CONSTRAINT [roles_can_view_leads_df] DEFAULT 0,
    [can_view_expenses] BIT NOT NULL CONSTRAINT [roles_can_view_expenses_df] DEFAULT 0,
    [can_view_settings] BIT NOT NULL CONSTRAINT [roles_can_view_settings_df] DEFAULT 0,
    [can_view_tasks] BIT NOT NULL CONSTRAINT [roles_can_view_tasks_df] DEFAULT 1,
    [can_view_dashboard] BIT NOT NULL CONSTRAINT [roles_can_view_dashboard_df] DEFAULT 1,
    [can_view_campaigns] BIT NOT NULL CONSTRAINT [roles_can_view_campaigns_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [roles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[budget_plans] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [budget_plans_status_df] DEFAULT 'DRAFT',
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [budget_plans_currency_df] DEFAULT 'XAF',
    [created_by] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [budget_plans_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [budget_plans_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[budget_lines] (
    [id] INT NOT NULL IDENTITY(1,1),
    [budget_plan_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [planned_amount] DECIMAL(18,2) NOT NULL,
    [notes] NVARCHAR(1000),
    [order] INT NOT NULL CONSTRAINT [budget_lines_order_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [budget_lines_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [budget_lines_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaigns] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [strategy] TEXT,
    [objective_id] INT NOT NULL,
    [start_date] DATETIME2 NOT NULL,
    [end_date] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [budget_plan_id] INT,
    [total_budget] DECIMAL(32,16),
    [created_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaigns_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaigns_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[objectives] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [is_active] BIT NOT NULL CONSTRAINT [objectives_is_active_df] DEFAULT 1,
    [created_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [objectives_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [objectives_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [objectives_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[target_audiences] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [created_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [target_audiences_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [target_audiences_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[channels] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [created_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [channels_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [channels_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_channels] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [channel_id] INT NOT NULL,
    [budget_allocated] DECIMAL(32,16) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_channels_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_channels_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_metrics] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [metric_name] NVARCHAR(1000) NOT NULL,
    [metric_value] DECIMAL(32,16) NOT NULL,
    [metric_date] DATETIME2 NOT NULL CONSTRAINT [campaign_metrics_metric_date_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_metrics_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_metrics_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[leads] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [assigned_to] INT,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [notes] NVARCHAR(1000),
    [next_follow_up_at] DATETIME2,
    [last_contact_at] DATETIME2,
    [converted_at] DATETIME2,
    [lost_reason] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [leads_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [leads_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[conversions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [lead_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [conversions_status_df] DEFAULT 'CONFIRMED',
    [amount] DECIMAL(18,2),
    [quantity] INT,
    [reference] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [conversion_date] DATETIME2 NOT NULL CONSTRAINT [conversions_conversion_date_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [conversions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [conversions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tasks] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [lead_id] INT,
    [assigned_to] INT,
    [created_by] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tasks_status_df] DEFAULT 'A_FAIRE',
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [tasks_priority_df] DEFAULT 'MOYENNE',
    [due_date] DATETIME2,
    [completed_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tasks_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [tasks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[lead_activities] (
    [id] INT NOT NULL IDENTITY(1,1),
    [lead_id] INT NOT NULL,
    [campaign_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [old_value] NVARCHAR(1000),
    [new_value] NVARCHAR(1000),
    [activity_date] DATETIME2 NOT NULL CONSTRAINT [lead_activities_activity_date_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [lead_activities_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [lead_activities_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[expenses] (
    [id] INT NOT NULL IDENTITY(1,1),
    [budget_line_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(32,16) NOT NULL,
    [expense_date] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [expenses_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [expenses_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[attachments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [fileName] NVARCHAR(1000) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [campaign_id] INT,
    [created_by] INT NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [attachments_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [attachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_kpi_targets] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [kpi_name] NVARCHAR(1000) NOT NULL,
    [target_value] DECIMAL(32,16) NOT NULL,
    [period_start] DATETIME2 NOT NULL,
    [period_end] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_kpi_targets_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_kpi_targets_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshSession] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [revokedAt] DATETIME2,
    [userAgent] NVARCHAR(1000),
    [ip] NVARCHAR(1000),
    CONSTRAINT [RefreshSession_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshSession_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_target_audiences] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [target_audience_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [campaign_target_audiences_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [campaign_target_audiences_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[articles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [code_sage_x3] NVARCHAR(1000),
    [code_sage_100] NVARCHAR(1000),
    [designation] NVARCHAR(1000) NOT NULL,
    [planned_quantity] INT,
    [quantity_at_creation] INT,
    [quantity_at_start] INT,
    [current_quantity] INT,
    [quantity_at_closure] INT,
    [sold_quantity] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [articles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [last_sync_at] DATETIME2,
    CONSTRAINT [articles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign_stock_sync_logs] (
    [id] INT NOT NULL IDENTITY(1,1),
    [campaign_id] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [campaign_stock_sync_logs_status_df] DEFAULT 'RUNNING',
    [started_at] DATETIME2 NOT NULL CONSTRAINT [campaign_stock_sync_logs_started_at_df] DEFAULT CURRENT_TIMESTAMP,
    [finished_at] DATETIME2,
    [message] NVARCHAR(1000),
    CONSTRAINT [campaign_stock_sync_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[article_families] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [article_families_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [article_families_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [article_families_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[glpi_users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [glpi_user_id] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [is_active] BIT NOT NULL CONSTRAINT [glpi_users_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [glpi_users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [glpi_users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [glpi_users_glpi_user_id_key] UNIQUE NONCLUSTERED ([glpi_user_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [budget_lines_budget_plan_id_idx] ON [dbo].[budget_lines]([budget_plan_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [campaigns_budget_plan_id_idx] ON [dbo].[campaigns]([budget_plan_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [expenses_budget_line_id_idx] ON [dbo].[expenses]([budget_line_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_userId_idx] ON [dbo].[RefreshSession]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_expiresAt_idx] ON [dbo].[RefreshSession]([expiresAt]);

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[budget_plans] ADD CONSTRAINT [budget_plans_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[budget_lines] ADD CONSTRAINT [budget_lines_budget_plan_id_fkey] FOREIGN KEY ([budget_plan_id]) REFERENCES [dbo].[budget_plans]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[budget_lines] ADD CONSTRAINT [budget_lines_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[campaigns] ADD CONSTRAINT [campaigns_objective_id_fkey] FOREIGN KEY ([objective_id]) REFERENCES [dbo].[objectives]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaigns] ADD CONSTRAINT [campaigns_budget_plan_id_fkey] FOREIGN KEY ([budget_plan_id]) REFERENCES [dbo].[budget_plans]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaigns] ADD CONSTRAINT [campaigns_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[objectives] ADD CONSTRAINT [objectives_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[target_audiences] ADD CONSTRAINT [target_audiences_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[channels] ADD CONSTRAINT [channels_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_channels] ADD CONSTRAINT [campaign_channels_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_channels] ADD CONSTRAINT [campaign_channels_channel_id_fkey] FOREIGN KEY ([channel_id]) REFERENCES [dbo].[channels]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_metrics] ADD CONSTRAINT [campaign_metrics_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_metrics] ADD CONSTRAINT [campaign_metrics_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[leads] ADD CONSTRAINT [leads_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[leads] ADD CONSTRAINT [leads_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[leads] ADD CONSTRAINT [leads_assigned_to_fkey] FOREIGN KEY ([assigned_to]) REFERENCES [dbo].[glpi_users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversions] ADD CONSTRAINT [conversions_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversions] ADD CONSTRAINT [conversions_lead_id_fkey] FOREIGN KEY ([lead_id]) REFERENCES [dbo].[leads]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[conversions] ADD CONSTRAINT [conversions_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_lead_id_fkey] FOREIGN KEY ([lead_id]) REFERENCES [dbo].[leads]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_assigned_to_fkey] FOREIGN KEY ([assigned_to]) REFERENCES [dbo].[glpi_users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[lead_activities] ADD CONSTRAINT [lead_activities_lead_id_fkey] FOREIGN KEY ([lead_id]) REFERENCES [dbo].[leads]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[lead_activities] ADD CONSTRAINT [lead_activities_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[lead_activities] ADD CONSTRAINT [lead_activities_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[expenses] ADD CONSTRAINT [expenses_budget_line_id_fkey] FOREIGN KEY ([budget_line_id]) REFERENCES [dbo].[budget_lines]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[expenses] ADD CONSTRAINT [expenses_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[attachments] ADD CONSTRAINT [attachments_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[attachments] ADD CONSTRAINT [attachments_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_kpi_targets] ADD CONSTRAINT [campaign_kpi_targets_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_kpi_targets] ADD CONSTRAINT [campaign_kpi_targets_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RefreshSession] ADD CONSTRAINT [RefreshSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_target_audiences] ADD CONSTRAINT [campaign_target_audiences_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_target_audiences] ADD CONSTRAINT [campaign_target_audiences_target_audience_id_fkey] FOREIGN KEY ([target_audience_id]) REFERENCES [dbo].[target_audiences]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[articles] ADD CONSTRAINT [articles_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[articles] ADD CONSTRAINT [articles_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[campaign_stock_sync_logs] ADD CONSTRAINT [campaign_stock_sync_logs_campaign_id_fkey] FOREIGN KEY ([campaign_id]) REFERENCES [dbo].[campaigns]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
