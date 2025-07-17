import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

test("renders 2048 header and game board", () => {
  render(<App />);
  // Header present
  expect(screen.getByText(/2048/i)).toBeInTheDocument();
  // Game Board
  expect(screen.getAllByTestId("tile").length).toBe(16);
  // Controls
  expect(screen.getByText(/Restart/i)).toBeInTheDocument();
  expect(screen.getByText(/Undo/i)).toBeInTheDocument();
  // Scores panel
  expect(screen.getByText(/Score/i)).toBeInTheDocument();
  expect(screen.getByText(/High/i)).toBeInTheDocument();
  expect(screen.getByText(/Moves/i)).toBeInTheDocument();
});
