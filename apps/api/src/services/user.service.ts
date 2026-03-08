import prisma from '../infrastructure/prisma/client';

export async function getCurrentUserWithRole(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
    },
  });
}