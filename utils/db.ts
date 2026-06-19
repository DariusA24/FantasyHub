import { PrismaClient } from '@prisma/client';
import { getAuthUser } from './actions';

// Singleton to prevent exhausting DB connections in dev (Next.js hot-reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Example fetchProfile function
export const fetchProfile = async () => {
  const user = await getAuthUser();
  console.log("Fetching profile with clerkId:", user.id);

  const profile = await prisma.profile.findUnique({
    where: { clerkId: user.id },
  });

  return profile;
};

// Simple helper to require an authenticated user.
export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
