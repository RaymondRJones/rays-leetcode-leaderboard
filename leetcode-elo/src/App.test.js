import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/zerotrac');
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve([
          {
            ID: 1,
            Title: 'A Test Problem',
            TitleSlug: 'a-test-problem',
            ContestSlug: 'weekly-contest-500',
            Rating: 1500,
            Topics: ['Array'],
          },
        ]),
    })
  );
});

afterEach(() => {
  window.history.pushState({}, '', '/');
  jest.restoreAllMocks();
});

test('loads the consolidated problem catalog', async () => {
  render(<App />);

  expect(screen.getByRole('link', { name: 'Zerotrac' })).toBeInTheDocument();
  expect(await screen.findByText('A Test Problem')).toBeInTheDocument();
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith('/problems_with_categories.json')
  );
});
