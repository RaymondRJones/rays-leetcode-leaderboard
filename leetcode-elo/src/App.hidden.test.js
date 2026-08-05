import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/nafis-saad-august');
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      progress: {
        nafis: Array(30).fill(false),
        saad: Array(30).fill(false),
      },
    }),
  });
});

afterEach(() => {
  window.history.pushState({}, '', '/');
  jest.restoreAllMocks();
});

test('serves the hidden checklist without advertising it in site navigation', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Nafis / Saad August Problems' })).toBeInTheDocument();
  expect(await screen.findByRole('checkbox', {
    name: 'nafis completed Alert Using Same Key-Card Three or More Times in a One Hour Period',
  })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Nafis / Saad August Problems' })).not.toBeInTheDocument();
  await waitFor(() => expect(document.title).toBe('Nafis / Saad August Problems'));
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
