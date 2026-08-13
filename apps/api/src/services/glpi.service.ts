import { glpiPool } from "../infrastructure/database/glpiMysql";
import prisma from "../infrastructure/prisma/client";

type GlpiUserRow = {
  id: number;
  name: string | null;
  realname: string | null;
  firstname: string | null;
  is_active: number | null;
  is_deleted?: number | null;
};

type GlpiUserDto = {
  glpiUserId: number;
  username: string | null;
  name: string;
  isActive: boolean;
};

function buildDisplayName(user: GlpiUserRow): string {
  const firstName = String(user.firstname || "").trim();
  const lastName = String(user.realname || "").trim();
  const login = String(user.name || "").trim();

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || login || `GLPI User ${user.id}`;
}

function mapGlpiUser(user: GlpiUserRow): GlpiUserDto {
  return {
    glpiUserId: user.id,
    username: user.name || null,
    name: buildDisplayName(user),
    isActive: user.is_active !== 0,
  };
}

function isGlpiConnectivityError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  const code = String(e?.code || "").toUpperCase();
  const message = String(e?.message || "").toLowerCase();

  return (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    message.includes("timeout") ||
    message.includes("connect") ||
    message.includes("connection lost")
  );
}

export class GlpiService {
  async testConnection() {
    try {
      await glpiPool.query("SELECT 1 as ok");

      return {
        success: true,
        message: "Connexion GLPI OK",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Connexion GLPI impossible",
        code: error?.code || null,
      };
    }
  }

  async getUsers(limit = 100): Promise<GlpiUserDto[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);

    try {
      const [rows] = await glpiPool.query(
        `SELECT id, name, realname, firstname, is_active
         FROM glpi_users
         WHERE is_deleted = 0
         ORDER BY id DESC
         LIMIT ?`,
        [safeLimit]
      );

      return (rows as GlpiUserRow[]).map(mapGlpiUser);
    } catch (error) {
      if (isGlpiConnectivityError(error)) {
        console.warn("[GLPI] getUsers unreachable:", (error as any)?.code || (error as any)?.message);
        return [];
      }

      throw error;
    }
  }

  async searchUsers(q: string, limit = 20): Promise<GlpiUserDto[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const query = String(q || "").trim();

    if (!query) return [];

    const like = `%${query}%`;

    try {
      const [rows] = await glpiPool.query(
        `SELECT id, name, realname, firstname, is_active
         FROM glpi_users
         WHERE is_deleted = 0
           AND (
             name LIKE ?
             OR realname LIKE ?
             OR firstname LIKE ?
           )
         ORDER BY id DESC
         LIMIT ?`,
        [like, like, like, safeLimit]
      );

      return (rows as GlpiUserRow[]).map(mapGlpiUser);
    } catch (error) {
      if (isGlpiConnectivityError(error)) {
        console.warn("[GLPI] searchUsers unreachable:", (error as any)?.code || (error as any)?.message);
        return [];
      }

      throw error;
    }
  }

  async getUserById(id: number): Promise<GlpiUserDto | null> {
    const userId = Number(id);

    if (!Number.isFinite(userId) || userId <= 0) {
      return null;
    }

    try {
      const [rows] = await glpiPool.query(
        `SELECT id, name, realname, firstname, is_active
         FROM glpi_users
         WHERE id = ?
           AND is_deleted = 0
         LIMIT 1`,
        [userId]
      );

      const user = (rows as GlpiUserRow[])?.[0];
      return user ? mapGlpiUser(user) : null;
    } catch (error) {
      if (isGlpiConnectivityError(error)) {
        console.warn("[GLPI] getUserById unreachable:", (error as any)?.code || (error as any)?.message);
        return null;
      }

      throw error;
    }
  }

  async syncUsersToLocalDb(limit = 1000) {
    try {
      const users = await this.getUsers(limit);

      if (!users.length) {
        return {
          success: true,
          synced: 0,
          message: "GLPI inaccessible ou aucun utilisateur disponible",
        };
      }

      for (const user of users) {
        await prisma.glpiUser.upsert({
          where: {
            glpiUserId: user.glpiUserId,
          },
          update: {
            name: user.name,
            username: user.username,
            email: null,
            isActive: user.isActive,
          },
          create: {
            glpiUserId: user.glpiUserId,
            name: user.name,
            username: user.username,
            email: null,
            isActive: user.isActive,
          },
        });
      }

      return {
        success: true,
        synced: users.length,
        message: `${users.length} utilisateur(s) GLPI synchronisé(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        synced: 0,
        message: error?.message || "Erreur inconnue pendant la synchro GLPI",
        code: error?.code || null,
      };
    }
  }
}