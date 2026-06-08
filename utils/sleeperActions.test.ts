import { describe, expect, it, jest } from '@jest/globals';
import {
  searchSleeperProfile,
  linkSleeperProfileToUser,
  unlinkSleeperProfileFromUser,
  getLinkedSleeperProfileForUser,
  getSleeperLeagues,
  getSleeperLeagueAvatarThumbnail,
  getSleeperLeagueRosters,
  getSleeperUserRecordForLeague,
  getSleeperPlayersByIds,
  getSleeperPlayersProfilePicture,
} from './sleeperActions';

// ...existing code...
jest.mock('./actions', () => ({
  getAuthUser: jest.fn(),
}));

jest.mock('./db', () => ({
  prisma: {
    profile: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    sleeperPlayer: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('./sleeperService', () => ({
  getSleeperUserByUsername: jest.fn(),
  getSleeperUserById: jest.fn(),
  getUserLeagues: jest.fn(),
  getLeagueRosters: jest.fn(),
}));

const mockedGetAuthUser = require('./actions').getAuthUser as jest.MockedFunction<any>;
const { prisma } = require('./db');
const {
  getSleeperUserByUsername,
  getSleeperUserById,
  getUserLeagues,
  getLeagueRosters,
} = require('./sleeperService') as {
  getSleeperUserByUsername: jest.MockedFunction<any>;
  getSleeperUserById: jest.MockedFunction<any>;
  getUserLeagues: jest.MockedFunction<any>;
  getLeagueRosters: jest.MockedFunction<any>;
};

describe('sleeperActions.searchSleeperProfile', () => {
  it('throws if query is empty/whitespace', async () => {
    await expect(searchSleeperProfile('  ')).rejects.toThrow('Query required');
  });

  it('uses getSleeperUserById when identifier looks like UUID', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    (getSleeperUserById as jest.MockedFunction<any>).mockResolvedValue({ user_id: id });

    const res = await searchSleeperProfile(id);

    expect(getSleeperUserById).toHaveBeenCalledWith(id);
    expect(res).toEqual({ user_id: id });
  });

  it('uses getSleeperUserByUsername otherwise', async () => {
    (getSleeperUserByUsername as jest.MockedFunction<any>).mockResolvedValue({ username: 'foo' });

    const res = await searchSleeperProfile('foo');

    expect(getSleeperUserByUsername).toHaveBeenCalledWith('foo');
    expect(res).toEqual({ username: 'foo' });
  });

  // Test for Error instances - should re-throw the original message
  it('re-throws Error instances with their original message', async () => {
    (getSleeperUserByUsername as jest.MockedFunction<any>).mockRejectedValue(new Error('boom'));

    await expect(searchSleeperProfile('user')).rejects.toThrow('boom');
  });

  // Test for non-Error exceptions - should wrap with generic message
  it('wraps non-Error exceptions with generic message', async () => {
    (getSleeperUserByUsername as jest.MockedFunction<any>).mockRejectedValue('some string error');

    await expect(searchSleeperProfile('user')).rejects.toThrow(
      'Could not find Sleeper profile. Please check the username/ID.'
    );
  });
});

describe('sleeperActions.linkSleeperProfileToUser', () => {
  it('throws on invalid sleeper profile', async () => {
    await expect(linkSleeperProfileToUser(null)).rejects.toThrow(
      'Invalid Sleeper profile data'
    );
    await expect(linkSleeperProfileToUser({})).rejects.toThrow(
      'Invalid Sleeper profile data'
    );
  });

  it('updates profile with sleeperProfileId', async () => {
    mockedGetAuthUser.mockResolvedValue({ id: 'clerk-1' });
    (prisma.profile.update as any).mockResolvedValue({ id: 1 });

    const profile = await linkSleeperProfileToUser({ user_id: 'sleeper-1' });

    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-1' },
      data: { sleeperProfileId: 'sleeper-1' },
    });
    expect(profile).toEqual({ id: 1 });
  });

  it('wraps errors with friendly message', async () => {
    mockedGetAuthUser.mockResolvedValue({ id: 'clerk-1' });
    (prisma.profile.update as any).mockRejectedValue(new Error('db down'));

    await expect(
      linkSleeperProfileToUser({ user_id: 'sleeper-1' })
    ).rejects.toThrow('db down');
  });
});

describe('sleeperActions.unlinkSleeperProfileFromUser', () => {
  it('sets sleeperProfileId to null', async () => {
    mockedGetAuthUser.mockResolvedValue({ id: 'clerk-2' });
    (prisma.profile.update as any).mockResolvedValue({ id: 2 });

    const result = await unlinkSleeperProfileFromUser();

    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-2' },
      data: { sleeperProfileId: null },
    });
    expect(result).toEqual({ id: 2 });
  });

  it('wraps errors with friendly message', async () => {
    mockedGetAuthUser.mockResolvedValue({ id: 'clerk-2' });
    (prisma.profile.update as any).mockRejectedValue(new Error('oops'));

    await expect(unlinkSleeperProfileFromUser()).rejects.toThrow('oops');
  });
});

describe('sleeperActions.getLinkedSleeperProfileForUser', () => {
  it('returns null if no profile or sleeperProfileId', async () => {
    mockedGetAuthUser.mockResolvedValue({ id: 'u1' });
    (prisma.profile.findUnique as any).mockResolvedValue(null);

    const res = await getLinkedSleeperProfileForUser();
    expect(res).toBeNull();
  });

  it('fetches sleeper profile when sleeperProfileId exists', async () => {
    mockedGetAuthUser.mockResolvedValue({ id: 'u2' });
    (prisma.profile.findUnique as any).mockResolvedValue({
      sleeperProfileId: 's1',
    });
    (getSleeperUserById as jest.MockedFunction<any>).mockResolvedValue({ user_id: 's1' });

    const res = await getLinkedSleeperProfileForUser();

    expect(getSleeperUserById).toHaveBeenCalledWith('s1');
    expect(res).toEqual({ user_id: 's1' });
  });
});
