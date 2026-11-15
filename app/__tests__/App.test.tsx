import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../src/App';

describe('App navigation', () => {
  it('switches between Feed and Profile from the floating nav', async () => {
    await render(<App />);
    expect(
      screen.getByRole('tab', { name: 'Feed', selected: true }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Profile' }));
    expect(
      screen.getByRole('tab', { name: 'Profile', selected: true }),
    ).toBeTruthy();
  });

  it('opens Publish from the + button and closes it', async () => {
    await render(<App />);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Publish a wallpaper' }),
    );
    expect(await screen.findByRole('header', { name: 'Publish' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('header', { name: 'Publish' })).toBeNull();
  });
});
