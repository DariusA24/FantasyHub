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
        bio: true,
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

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { profileImage, bio } = body as { profileImage?: string; bio?: string };

    const data: { profileImage?: string; bio?: string } = {};
    if (profileImage !== undefined) data.profileImage = profileImage;
    if (bio !== undefined) data.bio = bio;

    const updated = await prisma.profile.update({
      where: { clerkId: user.id },
      data,
      select: { id: true, profileImage: true, bio: true },
    });

    return NextResponse.json({ profile: updated }, { status: 200 });
  } catch (err) {
    console.error('Error in PATCH /api/profile:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
