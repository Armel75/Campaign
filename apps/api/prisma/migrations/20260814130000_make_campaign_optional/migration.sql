-- Rendre la campagne facultative pour les leads / activités / conversions.
-- (Migration minimale : seule la nullabilité change, les contraintes FK existantes sont conservées.)

BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[leads] ALTER COLUMN [campaign_id] INT NULL;

-- AlterTable
ALTER TABLE [dbo].[lead_activities] ALTER COLUMN [campaign_id] INT NULL;

-- AlterTable
ALTER TABLE [dbo].[conversions] ALTER COLUMN [campaign_id] INT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
