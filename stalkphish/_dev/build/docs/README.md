{{- generatedHeader }}
# StalkPhish Integration for Elastic

## Overview

The StalkPhish integration for Elastic ingests phishing URL threat intelligence from the [StalkPhish](https://stalkphish.io) platform. StalkPhish monitors thousands of URLs daily to detect phishing campaigns, fraud sites, and brand impersonation. Each detection record is enriched with hosting infrastructure details (IP, ASN), SSL certificate data, phishing kit intelligence (file hash, YARA family), and Telegram exfiltration attribution.

This integration polls the StalkPhish `/last` REST API endpoint on a configurable interval and indexes each phishing URL record as an ECS-mapped threat indicator document.

### Compatibility

This integration requires a StalkPhish account with a valid API token. A Free tier account (50 requests/day, 30 results/request, 4-hour history window) is sufficient for evaluation. For production use, a Starter plan or higher is recommended.

### How it works

The integration uses Elastic Agent's CEL (Common Expression Language) input to poll the StalkPhish REST API. On the first run it fetches records from the configured initial lookback window (`last_hours`). On subsequent runs it uses the `firstseentime` of the most recently seen record as the `from_date` bookmark to fetch only new detections. Authentication is via a static API token in the `Authorization: Token <api_token>` header.

## What data does this integration collect?

The StalkPhish integration collects phishing URL detection records from the following data stream:

* **phishing** — newly detected phishing URLs enriched with hosting infrastructure, SSL certificate, kit intelligence, and attribution data.

### Supported use cases

- **Threat indicator enrichment**: index StalkPhish phishing URLs as ECS threat indicators for use in security detection rules and threat hunting.
- **Phishing infrastructure tracking**: monitor hosting IPs, ASNs, and SSL certificates associated with active phishing campaigns.
- **Brand protection**: identify which brands are being impersonated and track kit families targeting your organization.
- **SIEM correlation**: correlate phishing host IPs and domains against other security telemetry using ECS `related.ip` and `related.hosts`.

## What do I need to use this integration?

- A [StalkPhish account](https://stalkphish.io/accounts/register/) with an API token (Free plan available).
- Elastic Agent installed and enrolled in Fleet.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html).

### Set up steps in StalkPhish

1. Register at [https://stalkphish.io/accounts/register/](https://stalkphish.io/accounts/register/) (free, email confirmation required).
2. Log in and navigate to your account profile to retrieve your API token.
3. Copy the API token — you will need it when configuring this integration in Kibana.

#### Vendor resources

- [StalkPhish API documentation](https://stalkphish.io/documentation/fullapi/)
- [StalkPhish data field documentation](https://stalkphish.io/documentation/data/)
- [StalkPhish pricing](https://stalkphish.io/pricing/)

### Set up steps in Kibana

1. In Kibana, navigate to **Management → Integrations** and search for **StalkPhish**.
2. Click **Add StalkPhish**.
3. Configure the integration:
   - **API Token** (required): paste your StalkPhish API token.
   - **Polling interval**: how often to poll for new detections. Free tier (50 req/day) requires at least 30 minutes between polls.
   - **Initial lookback**: how far back to fetch on the first run. Free tier is limited to a 4-hour window.
4. Click **Save and deploy changes**.

### Validation

After deploying, navigate to **Discover** in Kibana and filter by `data_stream.dataset: stalkphish.phishing`. New phishing URL records should appear within the first polling interval. Each document will have `event.kind: enrichment` and `event.type: [indicator]`.

## Troubleshooting

- No data is being collected: verify the API token is correct and the agent can reach `https://api.stalkphish.io` (TCP 443).
- HTTP 429 errors: the daily API request limit has been exceeded. Increase the polling interval or upgrade the StalkPhish plan.
- Empty results: the Free tier restricts the history window to 4 hours. If no new phishing URLs were detected in that window, an empty array is a valid response.
- Rate limit monitoring: use the StalkPhish `/me` endpoint to check `api_requests_remaining` before exhausting the daily quota.

## Performance and scaling

Each polling cycle consumes one API request. At the Free tier (50 req/day), a 30-minute interval consumes 48 requests/day, leaving headroom for occasional manual queries. For higher-volume plans, a shorter interval (5 minutes) is feasible.

For more information on architectures that can be used for scaling this integration, check the [Ingest Architectures](https://www.elastic.co/docs/manage-data/ingest/ingest-reference-architectures) documentation.

## Reference

### Inputs used

{{ inputDocs }}

### API usage

These APIs are used with this integration:

* `GET https://api.stalkphish.io/api/v1/last` — returns the most recently detected phishing URLs; supports `last_hours` (integer) on first run and `from_date` (ISO 8601) for incremental polling.

### Vendor documentation links

- [StalkPhish full API documentation](https://stalkphish.io/documentation/fullapi/)
- [StalkPhish data field documentation](https://stalkphish.io/documentation/data/)

### Data streams

#### phishing

The `phishing` data stream provides phishing URL detection records from StalkPhish. Each record represents a URL analyzed by the StalkPhish platform and confirmed (or suspected) to be a phishing or fraud site, enriched with hosting infrastructure, SSL certificate details, phishing kit intelligence, and attribution data.

##### phishing fields

{{ fields "phishing" }}

##### phishing sample event

{{ event "phishing" }}

{{ ilm }}
{{ transform }}
