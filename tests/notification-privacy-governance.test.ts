import {
  enforcePatientNotificationPrivacy,
  PATIENT_REMINDER_CHANNEL_ID,
  PRIVATE_REMINDER_COPY,
} from '@/services/patientNotificationPrivacy';
import { translate } from '@/localization';

test('Patient reminder copy is generic and excludes health detail', () => {
  expect(PRIVATE_REMINDER_COPY).toEqual({
    title: 'Medicine reminder',
    body: "It's time for your scheduled medicine.",
  });
  expect(JSON.stringify(PRIVATE_REMINDER_COPY)).not.toMatch(
    /medicine_name|dose|patient_name|symptom|diagnosis/i,
  );
});

test('Android Patient reminder channel uses private lock-screen visibility', async () => {
  const setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
  const loader = async () =>
    ({
      AndroidImportance: { MAX: 5 },
      AndroidNotificationVisibility: { PRIVATE: 0 },
      getNotificationChannelAsync: jest.fn().mockResolvedValue({
        name: 'MedicineApp reminders',
        description: 'Audible medication reminders',
        sound: 'medicine_reminder_alarm.wav',
      }),
      setNotificationChannelAsync,
    }) as never;
  await expect(
    enforcePatientNotificationPrivacy(loader, 'android'),
  ).resolves.toBe(true);
  expect(setNotificationChannelAsync).toHaveBeenCalledWith(
    PATIENT_REMINDER_CHANNEL_ID,
    expect.objectContaining({
      lockscreenVisibility: 0,
      sound: 'medicine_reminder_alarm.wav',
    }),
  );
});

test.each(['en-IN', 'hi-IN'] as const)(
  '%s notification JIT describes device settings, minimized previews, and authenticated detail',
  (locale) => {
    const copy = translate(locale, 'privacyNotificationDisclosure');
    expect(copy).toMatch(
      locale === 'en-IN' ? /device settings/i : /डिवाइस सेटिंग/,
    );
    expect(copy).toMatch(
      locale === 'en-IN' ? /privacy-minimized/i : /गोपनीयता-संक्षिप्त/,
    );
    expect(copy).toMatch(
      locale === 'en-IN' ? /authenticated app screens/i : /प्रमाणित ऐप स्क्रीन/,
    );
  },
);
