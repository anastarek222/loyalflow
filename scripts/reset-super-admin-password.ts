import "dotenv/config";
import bcrypt from "bcryptjs";
import { password } from "@inquirer/prompts";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SUPER_ADMIN_EMAIL = "anstarek211@gmail.com";

async function main() {
  const newPassword = await password({
    message: "New password (minimum 10 characters):",
    mask: "*",
    validate(value) {
      return value.length >= 10 || "Password must contain at least 10 characters";
    },
  });

  const confirmation = await password({
    message: "Confirm new password:",
    mask: "*",
  });

  if (newPassword !== confirmation) {
    throw new Error("Passwords do not match");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const admin = await prisma.user.update({
    where: {
      email: SUPER_ADMIN_EMAIL,
    },
    data: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      businessId: null,
      isActive: true,
    },
    select: {
      email: true,
      role: true,
      isActive: true,
    },
  });

  console.log("\n✅ Super Admin password updated successfully");
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
  console.log(`Active: ${admin.isActive}`);
}

main()
  .catch((error) => {
    console.error("\n❌ Failed to reset Super Admin password");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
