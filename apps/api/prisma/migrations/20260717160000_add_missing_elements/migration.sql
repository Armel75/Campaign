BEGIN TRY

BEGIN TRAN;

-- Ajout de la table manquante : article_families
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[article_families]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[article_families] (
        [id] INT NOT NULL IDENTITY(1,1),
        [name] NVARCHAR(1000) NOT NULL,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [article_families_created_at_df] DEFAULT CURRENT_TIMESTAMP,
        [updated_at] DATETIME2 NOT NULL,
        CONSTRAINT [article_families_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [article_families_name_key] UNIQUE NONCLUSTERED ([name])
    );
END

-- Ajout de la colonne manquante : campaigns.strategy
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[campaigns]') AND name = 'strategy')
BEGIN
    ALTER TABLE [dbo].[campaigns] ADD [strategy] TEXT NULL;
END

-- Ajout de la colonne manquante : campaigns.total_budget
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[campaigns]') AND name = 'total_budget')
BEGIN
    ALTER TABLE [dbo].[campaigns] ADD [total_budget] DECIMAL(32,16) NULL;
END

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
