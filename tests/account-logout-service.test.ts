import { AccountLogoutCoordinator } from '@/services/accountLogoutService';

function deferred(): {
  promise: Promise<void>;
  resolve(): void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

test('cleans registrations and pending actions before authoritative logout', async () => {
  const order: string[] = [];
  const coordinator = new AccountLogoutCoordinator(
    { unregister: jest.fn(async () => void order.push('registrations')) },
    { clear: jest.fn(async () => void order.push('pending-actions')) },
    { logout: jest.fn(async () => void order.push('session')) },
  );

  await coordinator.logout();

  expect(order.slice(0, 2).sort()).toEqual([
    'pending-actions',
    'registrations',
  ]);
  expect(order[2]).toBe('session');
});

test('cleanup failures never suppress authoritative local session logout', async () => {
  const sessionLogout = jest.fn().mockResolvedValue(undefined);
  const coordinator = new AccountLogoutCoordinator(
    { unregister: jest.fn().mockRejectedValue(new Error('registration')) },
    { clear: jest.fn().mockRejectedValue(new Error('pending action')) },
    { logout: sessionLogout },
  );

  await expect(coordinator.logout()).resolves.toBeUndefined();
  expect(sessionLogout).toHaveBeenCalledTimes(1);
});

test('concurrent logout requests share one destructive operation', async () => {
  const gate = deferred();
  const unregister = jest.fn(() => gate.promise);
  const clear = jest.fn().mockResolvedValue(undefined);
  const sessionLogout = jest.fn().mockResolvedValue(undefined);
  const coordinator = new AccountLogoutCoordinator(
    { unregister },
    { clear },
    { logout: sessionLogout },
  );

  const first = coordinator.logout();
  const second = coordinator.logout();
  expect(first).toBe(second);
  expect(unregister).toHaveBeenCalledTimes(1);
  expect(clear).toHaveBeenCalledTimes(1);

  gate.resolve();
  await first;
  expect(sessionLogout).toHaveBeenCalledTimes(1);
});
