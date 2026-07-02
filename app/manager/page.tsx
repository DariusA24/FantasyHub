import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/utils/db';

export default async function ManagerRedirectPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
    select: { username: true },
  });

  if (!profile) redirect('/profile/create');

  redirect(`/manager/${profile.username}`);
}
