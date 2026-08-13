import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const fullPermissions = {
  // Campaign permissions
  canViewAllCampaigns: true,
  canEditAllCampaigns: true,
  canDeleteAllCampaigns: true,
  canCreateCampaign: true,

  // Tasks
  canManageTasks: true,
  canAssignTasks: true,

  // Campaign content
  canManageCampaignArticles: true,
  canManageAttachments: true,

  // Administration
  canManageUsers: true,
  canManageRoles: true,
  canExportCampaign: true,

  // UI visibility permissions
  canViewDashboard: true,
  canViewStrategicDashboard: true,
  canViewCampaigns: true,
  canViewObjectives: true,
  canViewTasks: true,
  canViewLeads: true,
  canViewExpenses: true,
  canViewSettings: true,
};

export async function bootstrapAdmin() {
  if (String(process.env.BOOTSTRAP_ENABLED).toLowerCase() !== "true") return;

  const roleName = process.env.BOOTSTRAP_ADMIN_ROLE || "SUPER_ADMIN";
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;

  if (!username || !password || !email) {
    console.warn("[BOOTSTRAP] Missing admin credentials in .env");
    return;
  }

  try {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        ...fullPermissions,
      },
      create: {
        name: roleName,
        ...fullPermissions,
      },
    });

    console.log(`[BOOTSTRAP] Role ${roleName} ensured with full permissions`);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      console.log("[BOOTSTRAP] Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        roleId: role.id,
        matricule: process.env.BOOTSTRAP_ADMIN_MATRICULE || 'ADM001',
        firstName: process.env.BOOTSTRAP_ADMIN_FIRSTNAME || 'Admin',
        lastName: process.env.BOOTSTRAP_ADMIN_LASTNAME || 'Principal',
      },
    });

    console.log("[BOOTSTRAP] Admin user created successfully");
  } catch (error) {
    console.error("[BOOTSTRAP ERROR]", error);
  }
}