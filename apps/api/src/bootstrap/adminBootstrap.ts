import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function bootstrapAdmin() {
  if (String(process.env.BOOTSTRAP_ENABLED).toLowerCase() !== "true") return;

  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;

  if (!username || !password || !email) {
    console.warn("[BOOTSTRAP] Missing admin credentials in .env");
    return;
  }

  try {
    // 1️⃣ Vérifier si le rôle SUPER_ADMIN existe
    let role = await prisma.role.findFirst({
      where: { name: "SUPER_ADMIN" },
    });

    // 2️⃣ S'il n'existe pas, le créer
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: "SUPER_ADMIN",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log("[BOOTSTRAP] Role SUPER_ADMIN created");
    }

    // 3️⃣ Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      console.log("[BOOTSTRAP] Admin already exists");
      return;
    }

    // 4️⃣ Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Création de l'utilisateur
    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword, // correspond à password_hash
        roleId: role.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("[BOOTSTRAP] Admin user created successfully");
  } catch (error) {
    console.error("[BOOTSTRAP ERROR]", error);
  }
}