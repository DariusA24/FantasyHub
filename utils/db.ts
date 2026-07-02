import { PrismaClient } from '@prisma/client';
import { getAuthUser } from './actions';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const isDev      = process.env.NODE_ENV !== 'production';
  const directUrl  = process.env.DIRECT_URL;
  const poolerUrl  = process.env.DATABASE_URL;

  // In dev, bypass PgBouncer (connection_limit=1) by using the direct Postgres URL.
  // If DIRECT_URL is missing, warn loudly — that's the root cause of P2024 timeouts.
  let url: string | undefined;
  if (isDev) {
    if (directUrl) {
      url = directUrl;
    } else {
      console.warn(
        '[Prisma] DIRECT_URL is not set. Falling back to DATABASE_URL (PgBouncer, ' +
        'connection_limit=1). Add DIRECT_URL to .env.local to fix intermittent P2024 timeouts.'
      );
      url = poolerUrl;
    }
  } else {
    url = poolerUrl;
  }

  return new PrismaClient({
    datasources: { db: { url } },
    log: isDev ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

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
