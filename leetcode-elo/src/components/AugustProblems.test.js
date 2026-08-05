import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AugustProblems, { AUGUST_PROBLEMS } from './AugustProblems';

const emptyProgress = {
  nafis: Array(30).fill(false),
  saad: Array(30).fill(false),
};

beforeEach(() => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ progress: emptyProgress }),
    })
    .mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows the 30-day shared playlist without adding navigation', async () => {
  render(<AugustProblems />);

  expect(screen.getByRole('heading', { name: 'Nafis / Saad August Problems' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: AUGUST_PROBLEMS[0].title })).toHaveAttribute(
    'href',
    AUGUST_PROBLEMS[0].url
  );
  expect(screen.getAllByRole('link')).toHaveLength(30);
  expect(screen.getByText('Aug 5')).toBeInTheDocument();
  expect(screen.getByText('Sep 3')).toBeInTheDocument();
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('saves a client check-off through the shared API', async () => {
  render(<AugustProblems />);

  const [checkbox] = await screen.findAllByRole('checkbox');
  expect(checkbox).toHaveAttribute(
    'aria-label',
    `nafis completed ${AUGUST_PROBLEMS[0].title}`
  );
  fireEvent.click(checkbox);

  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(
    expect.stringContaining('/august-problems'),
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ client: 'nafis', problem: 1, completed: true }),
    })
  ));
  await waitFor(() => expect(checkbox).not.toBeDisabled());
});
