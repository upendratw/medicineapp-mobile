export interface DeviceRegistrationLogout {
  unregister(): Promise<void>;
}

export interface PendingNotificationLogout {
  clear(): Promise<void>;
}

export interface AuthoritativeSessionLogout {
  logout(): Promise<void>;
}

/**
 * Coordinates account-scoped cleanup while authentication is still available.
 * Device and pending-action cleanup are best effort; authoritative logout must
 * always run so a network failure cannot trap someone in a signed-in session.
 */
export class AccountLogoutCoordinator {
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly registrations: DeviceRegistrationLogout,
    private readonly pendingNotifications: PendingNotificationLogout,
    private readonly session: AuthoritativeSessionLogout,
  ) {}

  logout(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const pending = this.performLogout();
    this.inFlight = pending;
    const clear = () => {
      if (this.inFlight === pending) this.inFlight = null;
    };
    void pending.then(clear, clear);
    return pending;
  }

  private async performLogout(): Promise<void> {
    await Promise.allSettled([
      this.registrations.unregister(),
      this.pendingNotifications.clear(),
    ]);
    await this.session.logout();
  }
}
