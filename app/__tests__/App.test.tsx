import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../src/App';

describe('App', () => {
  it('renders the three tabs and navigates between them', async () => {
    await render(<App />);
    expect(await screen.findAllByText('Feed')).not.toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: /Profile/ }));
    expect(await screen.findAllByText('Profile')).toHaveLength(2);
  });
});
