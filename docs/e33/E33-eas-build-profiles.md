# E33 EAS Build Profiles

```text
Development -> Test/Preview -> Staging -> Production
```

| Profile     | Environment | Diagnostics          | Backend                      | Android output/use   |
| ----------- | ----------- | -------------------- | ---------------------------- | -------------------- |
| development | development | permitted explicitly | local HTTP permitted         | internal APK         |
| preview     | test        | false                | injected test configuration  | internal APK         |
| staging     | staging     | false                | injected HTTPS, non-loopback | internal APK         |
| production  | production  | false                | injected HTTPS, non-loopback | Play-preparation AAB |

`eas.json` contains no API URL or secret. EAS environment values must be provisioned and reviewed later. A profile defines intent; it does not prove the resulting artifact, signing, runtime behavior, or release eligibility.
