BEGIN TRY

BEGIN TRAN;

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

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_userId_idx] ON [dbo].[RefreshSession]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_expiresAt_idx] ON [dbo].[RefreshSession]([expiresAt]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshSession] ADD CONSTRAINT [RefreshSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
