import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/utils/db';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { username:  { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName:  { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      username: true,
      firstName: true,
      lastName: true,
      profileImage: true,
      sleeperProfileId: true,
    },
    take: 8,
    orderBy: { username: 'asc' },
  });

  return NextResponse.json(
    profiles.map((p) => ({
      username: p.username,
      firstName: p.firstName,
      lastName: p.lastName,
      profileImage: p.profileImage || null,
      hasSleeperLink: Boolean(p.sleeperProfileId),
    }))
  );
}
