BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [link] NVARCHAR(1000),
    [is_read] BIT NOT NULL CONSTRAINT [notifications_is_read_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_user_id_is_read_idx] ON [dbo].[notifications]([user_id], [is_read]);

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
