/**
 * Vitest setup file
 * Runs before all tests
 */

// Setup DOM environment
beforeEach(() => {
  // Clear document body before each test
  document.body.innerHTML = '';
  
  // Reset any global state
  (window as any).__draggedBlockType = undefined;
});

afterEach(() => {
  // Cleanup after each test
  document.body.innerHTML = '';
});

