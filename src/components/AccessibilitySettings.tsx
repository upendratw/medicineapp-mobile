import { AppButton, AppCard, AppText } from '@/components/primitives';
import { useTranslation } from '@/localization';
import {
  usePreferences,
  type AccessibilityPreferences,
  type TextSize,
} from '@/state/PreferencesContext';

const booleanSettings: readonly [
  keyof Omit<AccessibilityPreferences, 'textSize'>,
  (
    | 'highContrast'
    | 'reducedMotion'
    | 'largerControls'
    | 'screenReaderHelp'
    | 'reminderEmphasis'
    | 'haptics'
  ),
][] = [
  ['highContrast', 'highContrast'],
  ['reducedMotion', 'reducedMotion'],
  ['largerControls', 'largerControls'],
  ['screenReaderHelp', 'screenReaderHelp'],
  ['reminderEmphasis', 'reminderEmphasis'],
  ['haptics', 'haptics'],
];
export function AccessibilitySettings() {
  const { accessibility, updateAccessibility } = usePreferences();
  const { t } = useTranslation();
  const sizes: readonly [TextSize, 'default' | 'large' | 'extraLarge'][] = [
    ['default', 'default'],
    ['large', 'large'],
    ['extra-large', 'extraLarge'],
  ];
  return (
    <>
      <AppText variant="heading">{t('textSize')}</AppText>
      {sizes.map(([value, label]) => (
        <AppButton
          key={value}
          variant={accessibility.textSize === value ? 'primary' : 'secondary'}
          label={t(label)}
          accessibilityHint={`${t('textSize')}: ${t(label)}`}
          onPress={() => updateAccessibility({ textSize: value })}
        />
      ))}
      {booleanSettings.map(([key, label]) => (
        <AppCard key={key}>
          <AppText variant="label">{t(label)}</AppText>
          <AppButton
            variant="secondary"
            label={accessibility[key] ? t('on') : t('off')}
            accessibilityLabel={`${t(label)}: ${accessibility[key] ? t('on') : t('off')}`}
            onPress={() => updateAccessibility({ [key]: !accessibility[key] })}
          />
        </AppCard>
      ))}
      <AppText>
        Haptics and visual emphasis are supplementary only and never change
        medication logic.
      </AppText>
    </>
  );
}
