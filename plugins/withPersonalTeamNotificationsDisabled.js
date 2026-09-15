const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Removes the APNs entitlement only for the explicit local Personal Team build.
 * Runtime code separately treats that build as notification-unsupported.
 */
module.exports = function withPersonalTeamNotificationsDisabled(config) {
  return withEntitlementsPlist(config, (entitlementsConfig) => {
    delete entitlementsConfig.modResults['aps-environment'];
    return entitlementsConfig;
  });
};
