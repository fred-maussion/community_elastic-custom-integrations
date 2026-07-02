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

**Secret occurrences** (`secret_occurrence`): Each entry represents an individual raw detection —
the exact commit, file path, branch, and author where a secret was found. While `internal_secret_alert`
tracks one document per incident (the grouped finding), occurrences give the granular detection layer
for forensic investigation and code attribution.

**Public secret alerts** (`public_secret_alert`): Each entry represents a secret incident detected on
the **public internet** — GitHub public repositories, Pastebin, and similar public sources. The risk
profile is categorically higher than `internal_secret_alert`: the secret is already publicly visible and
may already be exploited. Ingested as `event.kind: alert` with `event.category: [intrusion_detection,
vulnerability]`. Requires only the `incidents:read` scope — no additional token needed.

### Supported use cases

- Alert on newly detected secrets exposures via Kibana alerting rules.
- Track the status lifecycle of incidents (TRIGGERED → ASSIGNED → RESOLVED) in Elastic SIEM.
- Correlate GitGuardian findings with other security signals using ECS-mapped fields
  (`event.kind: alert`, `event.category: [intrusion_detection, vulnerability]`).
- Use `vulnerability.severity` to prioritize remediation efforts.
- Build user entity profiles and risk scores in Elastic Entity Analytics from commit author
  identities (`audit_log`, `secret_occurrence`) and secret-detection alerts
  (`internal_secret_alert`, `honeytoken_event`).

### Elastic Security alerting

GitGuardian incidents are ingested with `event.kind: alert`. To surface them in the
**Elastic Security → Alerts** UI, enable the built-in **External Alerts** detection rule:

1. In Kibana, navigate to **Security → Rules → Detection rules (SIEM)**.
2. Search for **External Alerts** in the prebuilt rules list.
3. Click **Install rule**, then **Enable**.

Once enabled, every GitGuardian incident that arrives will automatically appear as an alert
in the Security Alerts view, enriched with the ECS fields mapped by this integration
(`rule.name`, `vulnerability.severity`, `event.url`, etc.).

### Elastic Entity Analytics

This integration is designed for use with **Elastic Entity Analytics**. Different data streams
contribute to Entity Analytics in distinct ways:

| Data stream | `event.kind` | Entity Store contribution | Risk Score contribution |
|---|---|---|---|
| `audit_log` | `event` | User entity profiles (actor identity) | No |
| `secret_occurrence` | `event` | User entity profiles (commit author identity) | No |
| `internal_secret_alert` | `alert` | No | Yes |
| `honeytoken_event` | `alert` | No | Yes |
| `public_secret_alert` | `alert` | No | Yes |

**How this works:**

- The Entity Store builds user profiles from documents with `event.kind: event`. Both `audit_log`
  (actor `user.name` / `user.email`) and `secret_occurrence` (commit author `user.name` /
  `user.email`) contribute user entity records. The Entity Store uses `user.name` as the primary
  key and `user.email` for cross-stream entity resolution. Both streams use the author's email
  address as `user.name`, which ensures consistent resolution across sources.

- Risk Score is driven by documents with `event.kind: alert`. `internal_secret_alert` and
  `honeytoken_event` generate risk signals but carry no user identity — they represent
  security findings, not user actions.

**Critical:** if you enable `internal_secret_alert` without `secret_occurrence`, detected secrets
generate risk alerts with no user attribution in the Entity Store. The commit author who
introduced the secret is only available in `secret_occurrence`. Enable both data streams together
to link risk signals to user entities:

```
secret_occurrence  →  user entity (who committed the secret)
internal_secret_alert  →  risk score (how serious the finding is)
Entity Analytics  →  joins them: "user X has Y active secrets, risk score Z"
```

For Entity Analytics to function correctly, Elastic recommends enabling at least `audit_log` and
`secret_occurrence` alongside `internal_secret_alert`.

## What do I need to use this integration?

- A GitGuardian account (Business or Enterprise plan recommended for full API access).
- A GitGuardian API token with the appropriate scopes:
  - `incidents:read` — required for the `internal_secret_alert`, `secret_occurrence`, and `public_secret_alert` data streams.
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

### Secret Occurrence data stream

The `secret_occurrence` data stream collects raw detection events from the GitGuardian workspace.
Each occurrence represents the exact commit, file, and author where a secret was found. Unlike
`internal_secret_alert` which groups detections into incidents, occurrences provide the granular
detection layer for forensic investigation and code attribution. The commit author email is mapped
to `user.name` for Elastic Entity Analytics integration. Requires the `incidents:read` API scope.

#### secret_occurrence fields

{{ fields "secret_occurrence" }}

#### Sample event

{{ event "secret_occurrence" }}

### Public Secret Alert data stream

The `public_secret_alert` data stream collects secrets incidents detected on the **public internet**
— GitHub public repositories, Pastebin, and similar sources — via the GitGuardian API. Each alert
represents a secret that is already publicly visible, making the risk categorically higher than an
internal incident. Mapped to ECS with `event.kind: alert`, `event.category: [intrusion_detection,
vulnerability]`, `rule.name` from the detector, and `vulnerability.severity` from the incident
severity. Includes `feedback_list` (community validation) and `share_url` (public shareable link)
where available. Requires only the `incidents:read` API scope.

#### public_secret_alert fields

{{ fields "public_secret_alert" }}

#### Sample event

{{ event "public_secret_alert" }}

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
- `GET /v1/occurrences/secrets` — Fetches raw secret occurrence detections, ordered by `date`
  and paginated via `per_page`. Requires the `incidents:read` API scope.
- `GET /v1/public-incidents/secrets` — Fetches publicly detected secrets incidents, filtered by
  `date_after` cursor and paginated via `per_page`. Requires the `incidents:read` API scope.
