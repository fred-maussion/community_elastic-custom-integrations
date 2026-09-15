{{- generatedHeader }}
# OVHcloud Managed Databases Integration for Elastic

## Overview

The OVHcloud Managed Databases integration for Elastic collects cluster inventory and health state, backup records, and maintenance window data from the OVHcloud Public Cloud Databases REST API. It covers all supported database engines: PostgreSQL, MySQL, MongoDB, Valkey, OpenSearch, ClickHouse, and Kafka.

### Compatibility

This integration is compatible with the OVHcloud Public Cloud REST API v1 (`eu.api.ovh.com/v1`, `ca.api.ovh.com/v1`, `api.us.ovhcloud.com/v1`). It is tested against the EU endpoint.

### How it works

The integration polls the OVHcloud REST API at configurable intervals using OAuth2 `client_credentials` authentication. For each configured database engine, it lists all cluster IDs, then fetches full details for each cluster. Backup and maintenance data are fetched from per-cluster sub-resources.

## What data does this integration collect?

The OVHcloud Managed Databases integration collects events of the following types:

* **cluster** — Full cluster inventory and health state: configuration, engine, version, plan, flavor, status, network, nodes, connection endpoints, IP restrictions, backup configuration, and storage details.
* **backup** — Individual backup records per cluster: type, status, size, creation time, and storage regions.
* **maintenance** — Scheduled and pending maintenance windows per cluster: description, status, scheduled time, and applied time.

### Supported use cases

- Monitor OVHcloud managed database fleet health and operational status.
- Alert on cluster status changes (e.g., DEGRADED, LOCKED states).
- Track backup coverage and retention across all clusters and engines.
- Audit pending maintenance windows before scheduled execution windows.

## What do I need to use this integration?

- An OVHcloud account with a Public Cloud project containing managed databases.
- An OVH IAM service account with a read-only policy scoped to your Public Cloud project (see setup steps below).
- Elastic Agent 8.19+ or 9.1+.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html).

### Set up steps in OVHcloud

1. Log into the [OVHcloud Control Panel](https://www.ovh.com/manager/).
2. Navigate to **Identity and Access Management (IAM)** → **Service Accounts**.
3. Click **Create a service account**, enter a descriptive name (e.g., `elastic-dbaas-monitor`), and note the generated `clientId` and `clientSecret`.
4. Navigate to **IAM** → **Policies** → **Create a policy**.
5. Configure the policy:
   - Resource type: **Public Cloud Project**
   - Resource: select your specific Public Cloud project
   - Actions: **Read** (grants GET access to all resources in the project, including databases)
6. Associate the policy to the service account you created.
7. Find your **Public Cloud project ID** (UUID): Public Cloud → Project → Overview → Project ID.

#### Vendor resources

- [OVHcloud IAM documentation](https://help.ovhcloud.com/csm/en-public-cloud-identity-access-management)
- [OVHcloud Public Cloud Databases documentation](https://help.ovhcloud.com/csm/en-public-cloud-databases)
- [OVH API Console](https://api.ovh.com/console/#/cloud/project/{serviceName}/database)

### Set up steps in Kibana

1. In Kibana, go to **Fleet** → **Integrations** and search for **OVHcloud Managed Databases**.
2. Click **Add OVHcloud Managed Databases**.
3. Configure the integration:
   - **Client ID**: Your OVH IAM service account client ID.
   - **Client Secret**: Your OVH IAM service account client secret.
   - **Token URL**: OAuth2 token endpoint (default: `https://www.ovh.com/auth/oauth2/token` for EU; change for CA/US regions).
   - **API Base URL**: OVH REST API base URL (default: `https://eu.api.ovh.com/v1`).
   - **Cloud Project ID**: Your Public Cloud project UUID (`serviceName`).
   - **Database Engines**: Comma-separated list of engine types to monitor (default includes all 7 supported engines).
4. Enable the data streams you want to collect (cluster, backup, maintenance) and configure per-stream polling intervals.
5. Save and deploy the policy.

### Validation

After deploying the integration, verify data is flowing:

1. In Kibana, go to **Discover** and filter by `data_stream.dataset: ovh_dbaas.cluster`.
2. You should see cluster documents within the first polling interval (default 5 minutes).
3. Check `data_stream.dataset: ovh_dbaas.backup` and `ovh_dbaas.maintenance` for the other streams.

## Troubleshooting

- No data is being collected: Verify that the service account has the correct IAM policy associated and that the Cloud Project ID (`service_name`) is correct.
- Authentication errors (`401 Unauthorized`): Confirm the `client_id` and `client_secret` are correct and the service account is enabled.
- Empty results for an engine: Verify you have clusters of that engine type in your project. Remove unused engines from the `engines` variable to reduce API call volume.
- Connection timeouts: Ensure outbound HTTPS (port 443) to `eu.api.ovh.com` and `www.ovh.com` is allowed from the Elastic Agent host.
- Non-EU region: Update both `token_url` and `api_url` to your region's endpoints.

## Performance and scaling

The integration makes approximately `(engines × clusters_per_engine)` API calls per poll cycle for the cluster stream, plus similar volume for backup and maintenance streams. With 7 engines and 10 clusters each, expect ~70–80 API calls per cluster poll. Increase the polling interval for large deployments to stay within rate limits.

For more information on architectures that can be used for scaling this integration, check the [Ingest Architectures](https://www.elastic.co/docs/manage-data/ingest/ingest-reference-architectures) documentation.

## Reference

### Inputs used

{{ inputDocs }}

### API usage

These APIs are used with this integration:

* `GET /cloud/project/{serviceName}/database/{engine}` — list cluster IDs per engine
* `GET /cloud/project/{serviceName}/database/{engine}/{clusterId}` — cluster details
* `GET /cloud/project/{serviceName}/database/{engine}/{clusterId}/node/{nodeId}` — node details
* `GET /cloud/project/{serviceName}/database/{engine}/{clusterId}/backup/{backupId}` — backup record details
* `GET /cloud/project/{serviceName}/database/{engine}/{clusterId}/maintenance` — maintenance windows

### Vendor documentation links

- [OVHcloud Public Cloud Databases documentation](https://help.ovhcloud.com/csm/en-public-cloud-databases)
- [OVH API Console — database endpoints](https://api.ovh.com/console/#/cloud/project/{serviceName}/database)
- [OVHcloud IAM documentation](https://help.ovhcloud.com/csm/en-public-cloud-identity-access-management)

### Data streams

#### cluster

The `cluster` data stream collects full cluster inventory and health state from all configured database engines. Each document represents one cluster at the time of polling.

##### cluster fields

{{ fields "cluster" }}

##### cluster sample event

{{ event "cluster" }}

#### backup

The `backup` data stream collects individual backup records per cluster. Each document represents one backup object.

##### backup fields

{{ fields "backup" }}

##### backup sample event

{{ event "backup" }}

#### maintenance

The `maintenance` data stream collects scheduled and pending maintenance window records per cluster. Each document represents one maintenance window.

##### maintenance fields

{{ fields "maintenance" }}

##### maintenance sample event

{{ event "maintenance" }}

{{ ilm }}

{{ transform }}
