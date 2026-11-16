import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { TextField } from './TextField';

type Props = {
  visible: boolean;
  heading: string;
  label: string;
  cta: string;
  maxLength: number;
  initial?: string;
  /** Returns the message to show under the field, or null when the name is fine. */
  validate: (name: string) => string | null;
  /** Shown when the server refuses (e.g. a name taken on another device). */
  serverError?: string | null;
  busy?: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

/**
 * A bottom sheet that asks for one name (a folder name, later the display
 * name). An empty name only disables the button; other problems show in red.
 */
export function NameSheet({
  visible,
  heading,
  label,
  cta,
  maxLength,
  initial = '',
  validate,
  serverError,
  busy,
  onSubmit,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initial);
  // Every opening starts from `initial`.
  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);
  const name = value.trim();
  const problem = name ? validate(name) : null;
  const invalid = !name || !!problem;
  const submit = () => {
    if (!invalid && !busy) onSubmit(name);
  };
  return (
    <Sheet visible={visible} onDismiss={onCancel} title={heading}>
      <TextField
        label={label}
        value={value}
        onChangeText={setValue}
        maxLength={maxLength}
        counterMax={maxLength}
        error={problem ?? serverError ?? null}
        autoFocus
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button label={cta} onPress={submit} disabled={invalid || busy} />
      <Button
        label={t('common.cancel')}
        variant="secondary"
        onPress={onCancel}
      />
    </Sheet>
  );
}
