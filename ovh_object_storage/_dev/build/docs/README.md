{{- generatedHeader }}
# OVHcloud Object Storage Integration for Elastic

## Overview

The OVHcloud Object Storage integration for Elastic enables monitoring of container inventory, configuration security posture, and storage policy state across your OVHcloud Public Cloud projects. It polls the OVHcloud REST API periodically and emits a full snapshot of each container's configuration, including encryption settings, versioning state, object lock (WORM) policies, and replication rules.

### Compatibility

This integration is compatible with the OVHcloud Public Cloud REST API (v1). It works with all OVHcloud regions (EU, CA, US) and all Object Storage tiers: Standard, High Performance, Infrequent Access, Active Archive, and Cold Archive.

### How it works

The integration uses the CEL input to poll the OVHcloud REST API using OAuth2 client credentials. On each poll cycle it lists all containers in the configured region, fetches full configuration details for each container, and retrieves lifecycle rules. Each container produces one event documenting its full configuration state.

## What data does this integration collect?

The OVHcloud Object Storage integration collects configuration state for the following data stream:

* **container** — Container inventory and configuration: encryption algorithm, versioning state, object lock (WORM) mode and period, replication rules, lifecycle policies, capacity metrics (object count and total bytes), and ownership information.

### Supported use cases

- **Security posture monitoring:** Detect unencrypted containers (`encryption.sseAlgorithm = plaintext`), versioning disabled or suspended after being enabled, and object lock misconfiguration.
- **Compliance auditing:** Track which containers have WORM compliance-mode locks, retention periods, and legal holds.
- **Capacity planning:** Monitor object count and total storage size per container over time.
- **Replication health:** Identify disabled replication rules that may indicate replication failures.

## What do I need to use this integration?

- An OVHcloud account with a Public Cloud project containing Object Storage containers.
- An OVHcloud IAM service account with the `publicCloudProject:apiovh:storage/get` permission on the target project.
- Elastic Agent installed on a host with outbound HTTPS access to the OVHcloud API.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html).

### Set up steps in OVHcloud

1. Log in to the [OVHcloud Control Panel](https://www.ovh.com/manager/).
2. Navigate to **IAM** → **Service Accounts** → **Create a service account**.
3. Note the generated **Client ID** and **Client Secret**.
4. Navigate to **IAM** → **Policies** → **Create a policy**.
5. Set the resource type to **Public Cloud project**, select your project, and add the action `publicCloudProject:apiovh:storage/get`.
6. Attach the policy to the service account you created.
7. Find your **Public Cloud project ID** (serviceName) in the project settings page.
8. Note your **storage region** (e.g., `gra`, `eu-west-par`, `sbg`). One integration policy per region.

#### Vendor resources

- [OVHcloud IAM documentation](https://help.ovhcloud.com/csm/en-public-cloud-identity-access-management)
- [OVHcloud Object Storage documentation](https://help.ovhcloud.com/csm/en-public-cloud-storage)
- [OVHcloud API console](https://api.ovh.com/console/)

### Set up steps in Kibana

1. In Kibana, go to **Fleet** → **Integrations** → search for "OVHcloud Object Storage".
2. Click **Add OVHcloud Object Storage**.
3. Configure the integration:
   - **OVHcloud API URL**: Select the URL for your region (EU: `https://eu.api.ovh.com/1.0`, CA: `https://ca.api.ovh.com/1.0`, US: `https://api.us.ovhcloud.com/1.0`).
   - **OVHcloud Project ID**: Your Public Cloud project ID (serviceName).
   - **OAuth2 Client ID / Client Secret**: From the service account created above.
   - **OAuth2 Token URL**: Match your region (`https://www.ovh.com/auth/oauth2/token` for EU).
   - **Storage Region**: The region to monitor (e.g., `gra`).
4. Save and deploy the integration to your Elastic Agent.

### Validation

After deploying, navigate to **Discover** in Kibana and filter by `event.dataset: ovh_object_storage.container`. You should see container state events within the first polling interval (default: 5 minutes).

## Troubleshooting

- No data collected: Verify the service account has the correct IAM policy and that the `publicCloudProject:apiovh:storage/get` action is granted on the correct project.
- 401 Unauthorized: Check that the Client ID and Client Secret are correct and that the OAuth2 Token URL matches your region.
- Empty container list: Verify the Storage Region is correct. The API is region-scoped; containers in other regions will not appear.
- Rate limit errors (429): Reduce the polling interval or the number of containers being monitored.

## Reference

### Inputs used

{{ inputDocs }}

### API usage

These APIs are used with this integration:

* `GET /cloud/project/{serviceName}/storage?regionName={region}` — list all containers
* `GET /cloud/project/{serviceName}/storage/{name}?regionName={region}&noObjects=true` — get container details
* `GET /cloud/project/{serviceName}/storage/{name}/lifecycle` — get lifecycle rules

### Vendor documentation links

- [OVHcloud Object Storage documentation](https://help.ovhcloud.com/csm/en-public-cloud-storage)
- [OVHcloud IAM documentation](https://help.ovhcloud.com/csm/en-public-cloud-identity-access-management)
- [OVHcloud API console](https://api.ovh.com/console/)

### Data streams

#### container

The `container` data stream provides a periodic snapshot of each OVHcloud Object Storage container's configuration state. Each event represents one container and includes its encryption settings, versioning status, object lock configuration, replication rules, lifecycle policies, and capacity metrics.

##### container fields

{{ fields "container" }}

{{ ilm }}

{{ transform }}
