import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: { name: 'MANAGER' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  // Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      roleId: adminRole.id,
    },
  });

  // Objectives
  await prisma.objective.upsert({
    where: { code: 'BRAND_AWARENESS' },
    update: {},
    create: { code: 'BRAND_AWARENESS', label: 'Brand Awareness', description: 'Increase visibility' },
  });

  await prisma.objective.upsert({
    where: { code: 'LEAD_GEN' },
    update: {},
    create: { code: 'LEAD_GEN', label: 'Lead Generation', description: 'Generate qualified leads' },
  });

  // Channels
  const channels = [
    { name: 'Email', description: 'Email Marketing' },
    { name: 'LinkedIn', description: 'Social Media' },
    { name: 'Google Ads', description: 'PPC' },
  ];

  for (const channel of channels) {
    await prisma.channel.create({
      data: channel,
    });
  }

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
