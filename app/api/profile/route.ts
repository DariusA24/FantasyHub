import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';
import { getAuthUser } from '@/utils/actions';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: {
        id: true,
        clerkId: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        profileImage: true,
        sleeperProfileId: true,
        sleeperProfile: true,
      },
    });

    console.log("API /api/profile returning profile:", profile);

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    console.error('Error in /api/profile:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
