-- CreateTable: notifications
CREATE TABLE [notifications] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT NOT NULL,
    [type] NVARCHAR(100) NOT NULL,
    [title] NVARCHAR(500) NOT NULL,
    [message] NVARCHAR(2000) NOT NULL,
    [link] NVARCHAR(1000),
    [is_read] BIT NOT NULL CONSTRAINT [DF_notifications_is_read] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_notifications_created_at] DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT [PK_notifications] PRIMARY KEY ([id])
);

-- CreateIndex
CREATE INDEX [IX_notifications_user_id_is_read] ON [notifications]([user_id], [is_read]);

-- AddForeignKey
ALTER TABLE [notifications] ADD CONSTRAINT [FK_notifications_user_id] FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE;
