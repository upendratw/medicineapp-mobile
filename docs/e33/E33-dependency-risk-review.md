# E33 Dependency Risk Review

Status: **OPEN / ACCEPTED FOR DEVELOPMENT / MUST RECHECK BEFORE RELEASE**.

On 2026-09-14, `npm audit` reports 14 moderate transitive advisories:

- `decode-uri-component` through `query-string` and Expo Router.
- `uuid` through `xcode` and Expo configuration/build tooling.

The suggested `npm audit fix --force` changes SDK-critical Expo packages and was not applied. Expo dependency compatibility remains green. This is not a production risk acceptance: maintainers must monitor upstream compatible releases, rerun audit, assess runtime reachability, and obtain security/release-owner disposition before a signed release.
