{{- generatedHeader }}
# GitGuardian Integration for Elastic

## Overview

The GitGuardian integration for Elastic enables collection of secrets incidents detected by
[GitGuardian](https://www.gitguardian.com/), a developer security platform that scans source
code repositories, CI/CD pipelines, and collaboration tools for leaked secrets (API keys,
passwords, certificates, and other credentials).

This integration polls the GitGuardian REST API at a configurable interval, ingests detected
secrets incidents into Elasticsearch, and maps them to ECS fields for use in Kibana dashboards
and SIEM detection rules.

### Compatibility

This integration has been tested against the GitGuardian Public API v1
(`https://api.gitguardian.com/v1`). A GitGuardian account with at least the `incidents:read`
API scope is required.

### How it works

The integration uses the Elastic Agent CEL input to periodically call the GitGuardian
`GET /v1/incidents/secrets` endpoint. On each poll it fetches incidents created after the
last known timestamp (stored in a cursor), parses the response, and ships the events to
Elasticsearch via the configured ingest pipeline. The pipeline normalizes fields to ECS and
stores the full raw incident payload in `event.original`.

## What data does this integration collect?

The GitGuardian integration collects two types of data from the GitGuardian API.

**Secrets incidents** (`internal_secret_alert`): Each incident represents a secret (API key,
password, certificate, or other credential) detected in a monitored source — such as a git
commit, a Slack message, or a CI pipeline log — and includes metadata such as the detector
type, severity, status, and a link to the incident in the GitGuardian dashboard.

**Audit logs** (`audit_log`): Each entry represents an administrative or user action performed
in the GitGuardian workspace — such as logins, token creation, incident resolution, or member
management — and includes the actor's identity, IP address, and the type of action performed.

**Honeytoken events** (`honeytoken_event`): Each entry represents a trigger event on a planted
decoy credential (AWS key, GitHub PAT, etc.) — meaning the honeytoken was found and actively
used by an attacker. Ingested as `event.kind: alert` with `event.category: [intrusion_detection]`,
with GeoIP enrichment on the attacker's IP address.

### Supported use cases

- Alert on newly detected secrets exposures via Kibana alerting rules.
- Track the status lifecycle of incidents (TRIGGERED → ASSIGNED → RESOLVED) in Elastic SIEM.
- Correlate GitGuardian findings with other security signals using ECS-mapped fields
  (`event.kind: alert`, `event.category: [intrusion_detection, vulnerability]`).
- Use `vulnerability.severity` to prioritize remediation efforts.

### Elastic Security alerting

GitGuardian incidents are ingested with `event.kind: alert`. To surface them in the
**Elastic Security → Alerts** UI, enable the built-in **External Alerts** detection rule:

1. In Kibana, navigate to **Security → Rules → Detection rules (SIEM)**.
2. Search for **External Alerts** in the prebuilt rules list.
3. Click **Install rule**, then **Enable**.

Once enabled, every GitGuardian incident that arrives will automatically appear as an alert
in the Security Alerts view, enriched with the ECS fields mapped by this integration
(`rule.name`, `vulnerability.severity`, `event.url`, etc.).

## What do I need to use this integration?

- A GitGuardian account (Business or Enterprise plan recommended for full API access).
- A GitGuardian API token with the appropriate scopes:
  - `incidents:read` — required for the `internal_secret_alert` data stream.
  - `audit_logs:read` — required for the `audit_log` data stream.
  - `honeytokens:read` — required for the `honeytoken_event` data stream.
- Elastic Agent deployed on a host with network access to `https://api.gitguardian.com`.

## How do I deploy this integration?

### Requirements

#### GitGuardian API Key

Create a service account API token in the GitGuardian dashboard:

1. Log in to [https://dashboard.gitguardian.com](https://dashboard.gitguardian.com).
2. Navigate to **Settings → API**.
3. Click **Generate token**.
4. Grant the token the `incidents:read` scope.
5. Copy and store the token securely — it is shown only once.

The following API permission scope is necessary:
- `incidents:read`

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](docs-content://reference/fleet/install-elastic-agents.md). You can install only one Elastic Agent per host.

### Onboard / configure

1. In Kibana, navigate to **Fleet → Integrations** and search for **GitGuardian**.
2. Click **Add GitGuardian**.
3. Fill in the required fields:
   - **Resource URL**: `https://api.gitguardian.com/v1` (default, change only for on-premises deployments).
   - **GitGuardian API Key**: Paste the API token generated above.
   - **Polling Interval**: How often to poll for new incidents (default: `1m`).
   - **Batch Size**: Number of incidents per API request, max 100 (default: `50`).
4. Optionally enable **Preserve original event** to retain the full raw API payload in `event.original`.
5. Click **Save and continue**, then **Add Elastic Agent** to deploy the policy.

### Validation

After deployment, navigate to **Kibana → Discover** and filter by:

```
event.dataset: "gitguardian.internal_secret_alert"
```

You should see incoming incidents within one polling interval. Check `event.original` to confirm the raw payload is present (when preserve original event is enabled).

## Troubleshooting

For help with Elastic ingest tools, check [Common problems](https://www.elastic.co/docs/troubleshoot/ingest/fleet/common-problems).

- **No data after configuration**: Verify the API key has `incidents:read` scope and that the
  agent host can reach `https://api.gitguardian.com`. Enable **Request tracing** temporarily
  to inspect raw HTTP exchanges.
- **Authentication errors**: GitGuardian API keys are single-use tokens. Regenerate and
  update the integration configuration if you see `401 Unauthorized` in logs.

## Scaling

For more information on architectures that can be used for scaling this integration, check the [Ingest Architectures](https://www.elastic.co/docs/manage-data/ingest/ingest-reference-architectures) documentation.

## Reference

### Internal Secret Alert data stream

The `internal_secret_alert` data stream collects secrets incidents from the GitGuardian API.

#### internal_secret_alert fields

{{ fields "internal_secret_alert" }}

#### Sample event

{{ event "internal_secret_alert" }}

### Audit Log data stream

The `audit_log` data stream collects administrative and user activity events from the
GitGuardian workspace. Events are mapped to ECS with `event.kind: event`,
`event.category: [iam]`, and actor identity fields (`user.name`, `user.email`) to support
Elastic Entity Analytics user entity resolution.

#### audit_log fields

{{ fields "audit_log" }}

#### Sample event

{{ event "audit_log" }}

### Honeytoken Event data stream

The `honeytoken_event` data stream collects trigger events from planted decoy credentials in the
GitGuardian workspace. Each event signals that an attacker found and actively used a honeytoken,
mapped to ECS with `event.kind: alert`, `event.category: [intrusion_detection]`, and GeoIP
enrichment on the attacker's source IP. Requires the `honeytokens:read` API scope.

#### honeytoken_event fields

{{ fields "honeytoken_event" }}

#### Sample event

{{ event "honeytoken_event" }}

### Inputs used
{{ inputDocs }}

### API usage

These APIs are used with this integration:

- `GET /v1/incidents/secrets` — Fetches secrets incidents, filtered by `date_after` cursor and
  paginated via `per_page`. See the [GitGuardian API docs](https://api.gitguardian.com/docs) for
  the full response schema.
- `GET /v1/audit_logs` — Fetches audit log entries, filtered by `date_after` cursor and
  paginated via `per_page`. Requires the `audit_logs:read` API scope.
- `GET /v1/honeytokens_events` — Fetches honeytoken trigger events, ordered by `triggered_at`
  and paginated via `per_page`. Requires the `honeytokens:read` API scope.
