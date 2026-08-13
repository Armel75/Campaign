import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const superAdminPermissions = {
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
  canViewCampaigns: true,
  canViewObjectives: true,
  canViewTasks: true,
  canViewLeads: true,
  canViewExpenses: true,
  canViewSettings: true,
};

const adminPermissions = {
  // Campaign permissions
  canViewAllCampaigns: true,
  canEditAllCampaigns: true,
  canDeleteAllCampaigns: false,
  canCreateCampaign: true,

  // Tasks
  canManageTasks: true,
  canAssignTasks: true,

  // Campaign content
  canManageCampaignArticles: true,
  canManageAttachments: true,

  // Administration
  canManageUsers: true,
  canManageRoles: false,
  canExportCampaign: true,

  // UI visibility permissions
  canViewDashboard: true,
  canViewCampaigns: true,
  canViewObjectives: true,
  canViewTasks: true,
  canViewLeads: true,
  canViewExpenses: true,
  canViewSettings: true,
};

const managerPermissions = {
  // Campaign permissions
  canViewAllCampaigns: true,
  canEditAllCampaigns: true,
  canDeleteAllCampaigns: false,
  canCreateCampaign: true,

  // Tasks
  canManageTasks: true,
  canAssignTasks: true,

  // Campaign content
  canManageCampaignArticles: true,
  canManageAttachments: true,

  // Administration
  canManageUsers: false,
  canManageRoles: false,
  canExportCampaign: true,

  // UI visibility permissions
  canViewDashboard: true,
  canViewCampaigns: true,
  canViewObjectives: true,
  canViewTasks: true,
  canViewLeads: true,
  canViewExpenses: true,
  canViewSettings: false,
};

const userPermissions = {
  // Campaign permissions
  canViewAllCampaigns: false,
  canEditAllCampaigns: false,
  canDeleteAllCampaigns: false,
  canCreateCampaign: false,

  // Tasks
  canManageTasks: false,
  canAssignTasks: false,

  // Campaign content
  canManageCampaignArticles: false,
  canManageAttachments: false,

  // Administration
  canManageUsers: false,
  canManageRoles: false,
  canExportCampaign: false,

  // UI visibility permissions
  canViewDashboard: true,
  canViewCampaigns: true,
  canViewObjectives: false,
  canViewTasks: true,
  canViewLeads: false,
  canViewExpenses: false,
  canViewSettings: false,
};

async function main() {
  console.log('Seeding database...');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {
      ...superAdminPermissions,
    },
    create: {
      name: 'SUPER_ADMIN',
      ...superAdminPermissions,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {
      ...adminPermissions,
    },
    create: {
      name: 'ADMIN',
      ...adminPermissions,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {
      ...managerPermissions,
    },
    create: {
      name: 'MANAGER',
      ...managerPermissions,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {
      ...userPermissions,
    },
    create: {
      name: 'USER',
      ...userPermissions,
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'admin@example.com',
      passwordHash,
      roleId: adminRole.id,
    },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log('Roles seeded:');
  console.log(`- SUPER_ADMIN (#${superAdminRole.id})`);
  console.log(`- ADMIN (#${adminRole.id})`);
  console.log(`- MANAGER (#${managerRole.id})`);
  console.log(`- USER (#${userRole.id})`);

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });