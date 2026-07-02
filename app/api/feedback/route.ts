import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';
import { getAuthUser } from '@/utils/actions';

export async function POST(req: Request) {
  try {
    const { type, title, body } = await req.json();

    if (!type || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['bug', 'suggestion'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const user = await getAuthUser();
    let profileId: number | undefined;
    if (user) {
      const profile = await prisma.profile.findUnique({
        where: { clerkId: user.id },
        select: { id: true },
      });
      if (profile) profileId = profile.id;
    }

    await prisma.feedback.create({
      data: { type, title, body, profileId: profileId ?? null },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Error in /api/feedback:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
