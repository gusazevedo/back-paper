import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../src/components/Button';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { TextField } from '../src/components/TextField';

describe('base components', () => {
  it('Button does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Create" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('SegmentedControl reports the tapped option', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        accessibilityLabel="Sort by"
        value="recent"
        onChange={onChange}
        options={[
          { value: 'recent', label: 'Recent' },
          { value: 'liked', label: 'Most liked' },
        ]}
      />,
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Most liked' }));
    expect(onChange).toHaveBeenCalledWith('liked');
  });

  it('TextField shows a character counter', async () => {
    await render(
      <TextField label="Folder name" value="Lock" counterMax={40} />,
    );
    expect(screen.getByText('4/40')).toBeTruthy();
  });
});
