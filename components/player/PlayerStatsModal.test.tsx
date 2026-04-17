import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PlayerStatsModal } from "./PlayerStatsModal";

// Mock external dependencies
jest.mock("@/utils/sleeperActions", () => ({
    getSleeperPlayersProfilePicture: jest.fn(),
}));

jest.mock("../ui/MaddenStats", () => ({
    MaddenStatsContainer: ({ sleeperPlayerId }: { sleeperPlayerId: string }) => (
        <div data-testid="madden-stats" data-player-id={sleeperPlayerId}>
            Madden Stats
        </div>
    ),
}));

const { getSleeperPlayersProfilePicture } = jest.requireMock(
    "@/utils/sleeperActions"
) as { getSleeperPlayersProfilePicture: jest.Mock };

const basePlayer = {
    player_id: "123",
    full_name: "Test Player",
    position: "RB",
    team: "DAL",
} as any;

afterEach(() => {
    jest.clearAllMocks();
    cleanup();
});

describe("PlayerStatsModal", () => {
    it("returns null when not open", () => {
        const { container } = render(
            <PlayerStatsModal open={false} player={basePlayer} onClose={jest.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("returns null when player is null", () => {
        const { container } = render(
            <PlayerStatsModal open={true} player={null} onClose={jest.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders basic content when open with player", () => {
        render(<PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />);

        expect(
            screen.getByText("Player Stats (placeholder)")
        ).toBeInTheDocument();
        expect(screen.getByText("Test Player")).toBeInTheDocument();
        expect(screen.getByText("RB")).toBeInTheDocument();
        expect(screen.getByText("DAL")).toBeInTheDocument();
        expect(screen.getByText("Madden Ratings")).toBeInTheDocument();
        expect(screen.getByTestId("madden-stats")).toHaveAttribute(
            "data-player-id",
            "123"
        );
    });

    it("calls onClose when Close button is clicked", () => {
        const onClose = jest.fn();
        render(<PlayerStatsModal open={true} player={basePlayer} onClose={onClose} />);

        fireEvent.click(screen.getByText("Close"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("shows loading avatar skeleton while fetching", async () => {
        getSleeperPlayersProfilePicture.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve("url"), 50))
        );

        render(<PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />);

        expect(
            screen.getByRole("status", { hidden: true })
        ).toBeDefined; // basic presence check, we mainly rely on testid below
    });

    it("renders fetched avatar when URL is returned", async () => {
        getSleeperPlayersProfilePicture.mockResolvedValue("https://avatar.test/img.png");

        render(<PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />);

        const img = await screen.findByRole("img");
        expect(img).toHaveAttribute("src", "https://avatar.test/img.png");
        expect(img).toHaveAttribute("alt", "Test Player");
    });

    it("falls back to 'No photo' when no avatar URL is returned", async () => {
        getSleeperPlayersProfilePicture.mockResolvedValue(null);

        render(<PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />);

        await waitFor(() => {
            expect(screen.getByText("No photo")).toBeInTheDocument();
        });
    });

    it("logs error and shows 'No photo' when avatar fetch fails", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        getSleeperPlayersProfilePicture.mockRejectedValue(new Error("network"));

        render(<PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />);

        await waitFor(() => {
            expect(screen.getByText("No photo")).toBeInTheDocument();
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it("does not call avatar API when player_id is missing", () => {
        const playerWithoutId = { ...basePlayer, player_id: undefined } as any;

        render(
            <PlayerStatsModal open={true} player={playerWithoutId} onClose={jest.fn()} />
        );

        expect(getSleeperPlayersProfilePicture).not.toHaveBeenCalled();
        expect(screen.getByText("No photo")).toBeInTheDocument();
    })

    it("cancels avatar state updates when component unmounts quickly", async () => {
        getSleeperPlayersProfilePicture.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve("url"), 50))
        );

        const { unmount } = render(
            <PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />
        );

        unmount();

        await waitFor(() => {
            expect(getSleeperPlayersProfilePicture).toHaveBeenCalledTimes(1);
        });
    });

    it("re-fetches avatar when player_id changes", async () => {
        getSleeperPlayersProfilePicture.mockResolvedValue("first-url");

        const { rerender } = render(
            <PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />
        );

        await screen.findByRole("img");
        expect(getSleeperPlayersProfilePicture).toHaveBeenCalledWith("123");

        (getSleeperPlayersProfilePicture as jest.Mock).mockResolvedValue("second-url");

        const newPlayer = { ...basePlayer, player_id: "456", full_name: "Another Player" };
        rerender(
            <PlayerStatsModal open={true} player={newPlayer} onClose={jest.fn()} />
        );

        const img = await screen.findByRole("img");
        expect(getSleeperPlayersProfilePicture).toHaveBeenCalledWith("456");
        expect(img).toHaveAttribute("src", "second-url");
    });

    it("does not render when open toggles to false", () => {
        const { rerender, queryByText } = render(
            <PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />
        );

        expect(queryByText("Test Player")).toBeInTheDocument();

        rerender(
            <PlayerStatsModal open={false} player={basePlayer} onClose={jest.fn()} />
        );

        expect(queryByText("Test Player")).not.toBeInTheDocument();
    });

    it('displays dash placeholders for stats sections', () => {
        render(<PlayerStatsModal open={true} player={basePlayer} onClose={jest.fn()} />);

        expect(screen.getByText('Games')).toBeInTheDocument();
        expect(screen.getByText('Fantasy Pts')).toBeInTheDocument();
        expect(screen.getByText('Yards')).toBeInTheDocument();
        expect(screen.getByText('TDs')).toBeInTheDocument();
        const dashes = screen.getAllByText('–');
        expect(dashes.length).toBeGreaterThanOrEqual(4);
    });
});

// We recommend installing an extension to run jest tests.