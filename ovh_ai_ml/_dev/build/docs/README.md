{{- generatedHeader }}
# OVHcloud AI & Machine Learning

## Overview

The **OVHcloud AI & Machine Learning** integration collects lifecycle state change events from [OVHcloud AI Deploy](https://www.ovhcloud.com/en/public-cloud/ai-deploy/) apps and [OVHcloud AI Training](https://www.ovhcloud.com/en/public-cloud/ai-training/) jobs via the regional OVHcloud AI REST API.

OVHcloud AI Deploy hosts custom machine learning models as scalable inference APIs. OVHcloud AI Training runs GPU-backed training jobs. This integration polls the AI API for state changes (app transitions such as INITIALIZING → RUNNING → FAILED, and job transitions such as QUEUED → RUNNING → DONE/ERROR), enabling monitoring of your AI workloads in Elastic.

### Compatibility

This integration is compatible with OVHcloud AI Deploy and AI Training in all supported regions. Authentication uses a static Bearer AI token with the **AI Reader** role — this is a separate credential from OVH OAuth2 IAM service accounts used by other OVHcloud integrations.

### How it works

The integration polls `GET /v1/app` (deploy) and `GET /v1/job` (training) on a configurable interval. It uses a timestamp cursor (`updatedAfter`) to fetch only resources that changed since the previous run. Each event represents the full current state of one app or job, including the transition history array.

## What data does this integration collect?

### `deploy` data stream

Collects AI Deploy app lifecycle state change events. Each event represents the current state of one deployed inference app (INITIALIZING, SCALING, RUNNING, STOPPING, STOPPED, FAILED, DELETING, ERROR).

**Fields per event**: app ID and name, owning user, current state, available replicas, resource allocation (GPU/CPU/memory), creation and last transition timestamps, public endpoint URL, user-defined labels.

{{ fields "deploy" }}

### `training` data stream

Collects AI Training job lifecycle state change events. Each event represents the current state of one training job (QUEUED, INITIALIZING, RUNNING, INTERRUPTED, DONE, ERROR, TIMEOUT, FAILED).

**Fields per event**: job ID and name, owning user, current state, exit code, runtime duration, queue/start/stop timestamps, resource allocation (GPU/CPU), user-defined labels.

{{ fields "training" }}

## What do I need to use this integration?

- An OVHcloud account with at least one Public Cloud project using AI Deploy or AI Training.
- An **AI token** with the **AI Reader** role, created in the OVHcloud AI Dashboard.
- The **regional AI API base URL** for your project (e.g., `https://gra.training.ai.cloud.ovh.net` for Gravelines, France).

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html).

### Set up on OVHcloud

#### Step 1 — Create an AI token

1. Log into the [OVHcloud Control Panel](https://www.ovhcloud.com/manager/).
2. Navigate to **Public Cloud** → your project → **AI & Machine Learning** → **AI Dashboard** → **Tokens**.
3. Click **Generate an AI token** and fill in:

| Field | Value |
|-------|-------|
| Name | Any descriptive name (e.g., `elastic-package-ai-token`) |
| Label selector | Leave empty to access all resources, or filter by `type=app` (Deploy only) or `type=job` (Training only) |
| Role | **AI Reader** — the wizard defaults to *AI Operator* (read+write); you must change it to *AI Reader* |
| Region | Select the region where your AI resources are deployed (e.g., Gravelines) |

4. Click **Generate** and copy the token value — it is shown only once.

#### Step 2 — Find your regional API URL

The AI API base URL depends on the region you selected when creating the token:

| Region | Base URL |
|--------|----------|
| Gravelines, France (GRA) | `https://gra.training.ai.cloud.ovh.net` |
| Beauharnois, Canada (BHS) | `https://bhs.training.ai.cloud.ovh.net` |
| Frankfurt, Germany (DE) | `https://de.training.ai.cloud.ovh.net` |
| London, United Kingdom (UK) | `https://uk.training.ai.cloud.ovh.net` |
| Warsaw, Poland (WAW) | `https://waw.training.ai.cloud.ovh.net` |

The token region and the API URL region must match. If you use multiple regions, add one integration instance per region.

#### Step 3 — Configure the integration in Kibana

Add the **OVHcloud AI & Machine Learning** integration and fill in:

| Field | Value |
|-------|-------|
| AI API Base URL | Your regional base URL (e.g., `https://gra.training.ai.cloud.ovh.net`) |
| AI Token | The token you created in Step 1 |

### Validation

After deploying, navigate to **Discover** in Kibana and filter on `data_stream.dataset: ovh_ai_ml.deploy` or `data_stream.dataset: ovh_ai_ml.training`. Events appear after the next poll interval.

## Troubleshooting

- **No data collected**: Verify the AI token has the **AI Reader** role and the base URL matches the token's region.
- **HTTP 401**: The token may have been revoked or created for a different region. Create a new token in the AI Dashboard with the correct region.
- **HTTP 404**: Verify the base URL — it must include the region prefix and end before any path (`/v1/app` and `/v1/job` are added automatically by the integration).
- **Multiple regions**: Each region requires a separate AI token and a separate integration instance.

## Reference

### Inputs used
{{ inputDocs }}

### Vendor documentation links
- [OVHcloud AI Deploy documentation](https://docs.ovhcloud.com/en/guides/public-cloud/ai-machine-learning/ai-deploy-capabilities)
- [OVHcloud AI Training documentation](https://docs.ovhcloud.com/en/guides/public-cloud/ai-machine-learning/)
- [AI token management (CLI guide)](https://docs.ovhcloud.com/en/guides/public-cloud/ai-machine-learning/ai-cli-app-token)
- [ovhai Python SDK (API reference)](https://github.com/ovh/ovhai-python-sdk)

{{ ilm }}
{{ transform }}
