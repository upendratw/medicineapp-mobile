import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const route = (name: string) =>
  readFileSync(join(process.cwd(), 'src/app/(onboarding)', name), 'utf8');

test('onboarding progresses through welcome, profile, accessibility, and completion', () => {
  expect(route('welcome.tsx')).toContain("router.push('/profile-basics')");
  expect(route('profile-basics.tsx')).toContain(
    "router.push('/accessibility')",
  );
  expect(route('accessibility.tsx')).toContain("router.push('/complete')");
  expect(route('complete.tsx')).toContain('finish');
});

test('onboarding states the clinical safety boundary', () => {
  const content = `${route('welcome.tsx')} ${route('complete.tsx')}`;
  expect(content).toContain('does not replace your doctor or pharmacist');
  expect(content).toContain('does not prescribe or make treatment decisions');
});

test('onboarding does not solicit diagnosis or treatment preferences', () => {
  const content = route('profile-basics.tsx');
  expect(content).toContain('not asking for diagnoses');
  expect(content).not.toContain('recommended dose');
});

test('accessibility entry point offers a bounded non-clinical preference', () => {
  const content = route('accessibility.tsx');
  expect(content).toContain('Use device settings');
  expect(content).toContain('Enhanced clarity');
});
