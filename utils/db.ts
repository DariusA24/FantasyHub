import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getAuthUser } from './actions';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

// Example fetchProfile function
export const fetchProfile = async () => {
  const user = await getAuthUser(); // Ensure this function retrieves the authenticated user
  console.log("Fetching profile with clerkId:", user.id);

  const profile = await prisma.profile.findUnique({
    where: { clerkId: user.id }, // Ensure 'clerkId' exists in the database
  });

  return profile;
};

// Simple helper to require an authenticated user.
// Extend this to check roles/permissions if needed.
export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}