import "dotenv/config";
import bcrypt from "bcryptjs";
import { input, password } from "@inquirer/prompts";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";
import { logServerError } from "../lib/server/logging";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("\nCreate LoyalFlow Super Admin\n");

  const firstName = await input({
    message: "First name:",
    validate(value) {
      return value.trim().length >= 2 || "Enter at least 2 characters";
    },
  });

  const lastName = await input({
    message: "Last name (optional):",
  });

  const email = await input({
    message: "Email:",
    validate(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
        ? true
        : "Enter a valid email";
    },
  });

  const adminPassword = await password({
    message: "Password (minimum 10 characters):",
    mask: "*",
    validate(value) {
      return value.length >= 10 || "Password must contain at least 10 characters";
    },
  });

  const passwordConfirmation = await password({
    message: "Confirm password:",
    mask: "*",
  });

  if (adminPassword !== passwordConfirmation) {
    throw new Error("Passwords do not match");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new Error(`A user already exists with email: ${normalizedEmail}`);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
      email: normalizedEmail,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      businessId: null,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  console.log("\n✅ Super Admin created successfully");
  console.log(`Name: ${admin.firstName} ${admin.lastName ?? ""}`.trim());
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
}

main()
  .catch((error) => {
    console.error("\n❌ Failed to create Super Admin");
    logServerError("create_super_admin_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
