{{- generatedHeader }}
# OVHcloud Public Cloud Compute Integration for Elastic

## Overview

The OVHcloud Public Cloud Compute integration collects virtual machine instance state data from the OVHcloud Public Cloud API. It provides a CMDB-style snapshot of all instances in a project, refreshed on a configurable polling interval.

### Compatibility

This integration is compatible with the OVHcloud Public Cloud Compute v2 REST API. It supports all OVHcloud regions (EU, CA, US).

### How it works

The integration polls the OVHcloud v2 API endpoint `GET /v2/publicCloud/project/{serviceName}/compute/instance` using OAuth2 client_credentials authentication. It handles cursor-based pagination to collect all instances across large projects, then ships each instance as an Elastic event with `event.kind: state`.

## What data does this integration collect?

The OVHcloud Public Cloud Compute integration collects log messages of the following types:

* **Instance state** — Full snapshot of each virtual machine instance in the project, including flavor, image, networking, power state, and resource status.

### Supported use cases

- **Asset inventory** — Maintain a current view of all VM instances in your OVHcloud project in Elastic
- **Change detection** — Detect instance creation, deletion, and state changes over time
- **Security posture** — Audit instance configurations, security groups, and network exposure
- **Cost visibility** — Track instance types and sizes across regions

## What do I need to use this integration?

- An OVHcloud Public Cloud project with at least one instance
- An OVHcloud IAM service account with the **AI Operator** role (or equivalent read access to compute resources)
- OAuth2 client credentials (client ID and client secret) for the service account

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html). You can install only one Elastic Agent per host.

### Set up steps in OVHcloud

1. Log in to the [OVHcloud Control Panel](https://www.ovh.com/manager/).
2. Navigate to **IAM** → **Service Accounts** and create a new service account.
3. Assign the service account the **AI Operator** role (or a custom role with read access to `/v2/publicCloud/project/*/compute/instance`).
4. Generate client credentials (client ID and client secret). Save the secret — it is shown only once.
5. Note your project ID (serviceName) from the Control Panel URL: `/public-cloud/#/pci/projects/<ID>`.

#### Regional endpoint table

| OVHcloud Region | API URL | Token URL |
|---|---|---|
| Europe (EU, default) | `https://eu.api.ovh.com/1.0` | `https://www.ovh.com/auth/oauth2/token` |
| Canada (CA) | `https://ca.api.ovh.com/1.0` | `https://ca.ovh.com/auth/oauth2/token` |
| United States (US) | `https://api.us.ovhcloud.com/1.0` | `https://us.ovhcloud.com/auth/oauth2/token` |

#### Vendor resources

- [OVHcloud IAM documentation](https://help.ovhcloud.com/csm/en-identity-access-management)
- [OVHcloud Public Cloud API reference](https://eu.api.ovh.com/console/#/cloud)
- [OVHcloud OAuth2 service accounts](https://help.ovhcloud.com/csm/en-account-api-oauth2)

### Set up steps in Kibana

1. In Kibana, go to **Fleet** → **Add integration** and search for **OVHcloud Public Cloud Compute**.
2. Add the integration and configure the following fields:
   - **OVHcloud API URL** — select the URL for your OVHcloud region
   - **OVHcloud Project ID** — your Public Cloud project UUID
   - **OAuth2 Client ID** — the service account client ID
   - **OAuth2 Client Secret** — the service account client secret
   - **OAuth2 Token URL** — the token URL for your OVHcloud region
   - **Interval** — polling interval (e.g., `5m`; instances update infrequently)

### Validation

After deploying the integration, verify data is flowing:

1. In Kibana, open **Discover** and filter by `data_stream.dataset: ovh_compute.instance`.
2. Confirm events appear with `event.kind: state` and `cloud.provider: ovhcloud`.
3. Check that `cloud.instance.id`, `cloud.region`, and `cloud.machine.type` are populated.

## Troubleshooting

- No data collected: Verify that the service account has the correct IAM role. Test credentials by calling `GET /v2/publicCloud/project/{serviceName}/compute/instance` directly with a valid OAuth2 token.
- Authentication failures: Ensure the token URL matches the API URL region (e.g., both EU or both CA).
- Empty results: Confirm the project ID is correct and the project contains running instances.

## Performance and scaling

For projects with many instances, the integration handles cursor pagination automatically. The `5m` default interval is appropriate for most projects. For very large projects (hundreds of instances), consider increasing the timeout with `http_client_timeout`.

For more information on architectures that can be used for scaling this integration, check the [Ingest Architectures](https://www.elastic.co/docs/manage-data/ingest/ingest-reference-architectures) documentation.

## Reference

### Inputs used
{{ inputDocs }}

### API usage

These APIs are used with this integration:

* `GET /v2/publicCloud/project/{serviceName}/compute/instance` — lists all VM instances with cursor pagination; requires OAuth2 Bearer token

### Vendor documentation links

- [OVHcloud Public Cloud Compute documentation](https://help.ovhcloud.com/csm/en-public-cloud-compute)
- [OVHcloud REST API reference](https://eu.api.ovh.com/console/#/cloud)
- [OVHcloud IAM and service accounts](https://help.ovhcloud.com/csm/en-identity-access-management)

### Data streams

#### instance

The `instance` data stream provides a periodic state snapshot of all OVHcloud Public Cloud virtual machine instances in a project. Each document represents one instance at one point in time.

##### instance fields

{{ fields "instance" }}

##### instance sample event

{{ event "instance" }}

{{ ilm }}

{{ transform }}
