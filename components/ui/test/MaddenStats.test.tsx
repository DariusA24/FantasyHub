import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MaddenStatsContainer } from '../MaddenStats';

// Mock fetch
global.fetch = jest.fn();

const mockMaddenPlayer = {
  id: '123',
  full_name: 'Patrick Mahomes',
  position: 'QB',
  team: 'KC',
  overall: 99,
  speed: 82,
  strength: 65,
  agility: 89,
  awareness: 99,
};

describe('MaddenStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<MaddenStatsContainer sleeperPlayerId="123" />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders no player id message', () => {
    render(<MaddenStatsContainer sleeperPlayerId="" />);
    expect(screen.getByText('Select a player to view Madden stats.')).toBeInTheDocument();
  });

  it('renders player stats on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMaddenPlayer,
    });

    render(<MaddenStatsContainer sleeperPlayerId="123" />);

    await waitFor(() => {
      expect(screen.getByText('99')).toBeInTheDocument(); // Overall
      expect(screen.getByText('82')).toBeInTheDocument(); // Speed
      expect(screen.getByText('65')).toBeInTheDocument(); // Strength
      expect(screen.getByText('89')).toBeInTheDocument(); // Agility
    });
  });

  it('renders error message on failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));

    render(<MaddenStatsContainer sleeperPlayerId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load Madden stats.')).toBeInTheDocument();
    });
  });

  it('renders no stats found message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<MaddenStatsContainer sleeperPlayerId="123" />);

    await waitFor(() => {
      expect(screen.getByText('No Madden stats found for this player.')).toBeInTheDocument();
    });
  });

  it('applies correct color for high stats (90+)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMaddenPlayer,
    });

    render(<MaddenStatsContainer sleeperPlayerId="123" />);

    await waitFor(() => {
      const overallElement = screen.getByText('99');
      expect(overallElement).toHaveClass('text-emerald-400');
    });
  });

  it('applies correct color for medium stats (70-79)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockMaddenPlayer,
        speed: 75,
      }),
    });

    render(<MaddenStatsContainer sleeperPlayerId="123" />);

    await waitFor(() => {
      const speedElement = screen.getByText('75');
      expect(speedElement).toHaveClass('text-orange-400');
    });
  });

  it('applies correct color for low stats (<70)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockMaddenPlayer,
        strength: 55,
      }),
    });

    render(<MaddenStatsContainer sleeperPlayerId="123" />);

    await waitFor(() => {
      const strElement = screen.getByText('55');
      expect(strElement).toHaveClass('text-red-400');
    });
  });
});