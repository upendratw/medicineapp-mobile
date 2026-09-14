# E33 Mobile Operational Telemetry

The mobile foundation provides predefined counters and duration buckets through `MetricSink`. Labels are limited to low-cardinality category and outcome. Default `NoopMetricSink` exports nothing. No analytics/monitoring SDK or external telemetry connection was added.

Defined signals cover app/auth/API/network/cache/secure-storage/deep-link/push/camera concerns. API failures increment a counter with no endpoint or identity and observe one of four duration buckets. Production sink selection, sampling, retention, access control, dashboards, exporter availability, and privacy review remain pending.
