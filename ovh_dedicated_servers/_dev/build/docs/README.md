{{- generatedHeader }}
{{/*
This template can be used as a starting point for writing documentation for your new integration. For each section, fill in the details
described in the comments.

Find more detailed documentation guidelines in https://www.elastic.co/docs/extend/integrations/documentation-guidelines
*/}}
# OVHcloud Dedicated Servers Integration for Elastic

## Overview

The OVHcloud Dedicated Servers integration collects control-plane audit and activity data for OVHcloud bare-metal (dedicated) servers: the task/job history for every async operation performed on a server (reinstalls, reboots, IPMI/KVM access requests, firewall toggles, backup-FTP ACL changes, network changes), hardware intervention/incident history, an account-wide provisioning/activity log, and a current-state snapshot of backup-FTP IP allow-lists.

### Compatibility

This integration is compatible with OVHcloud Dedicated Servers (Bare Metal) accounts across all commercial ranges (Rise, Advance, Scale, High Grade) and all OVH regions (EU, CA, US) reachable via the OVH management API (`api.ovh.com` / `eu.api.ovh.com` / `ca.api.ovh.com` / `api.us.ovhcloud.com`).

### How it works

This integration polls the OVHcloud REST API on a schedule using the CEL input. It does not collect operating-system-level logs from inside the dedicated server itself — only the control-plane data OVH's own management API exposes about the server (provisioning, hardware lifecycle, network configuration, and support/intervention tickets).

## What data does this integration collect?

The OVHcloud Dedicated Servers integration collects log messages of the following types:
* Task history — every async operation performed on a server (reinstalls, reboots, IPMI/KVM access requests and resets, firewall enable/disable, backup-FTP ACL changes, RIPE organization changes, floating-IP/virtual-MAC moves, hardware updates)
* Hardware intervention history — past and scheduled technical interventions on a server
* Provisioning/activity log — an account-wide, human-readable feed of server milestones (installs, reboots, network incident notices)
* Backup-FTP ACL snapshots — current-state IP allow-list entries for the dedicated backup storage feature

### Supported use cases

This integration is useful for security and operations teams that need visibility into control-plane changes on OVHcloud bare-metal infrastructure: detecting unexpected IPMI/KVM access requests, firewall state changes, or backup-FTP ACL modifications; auditing hardware intervention history; and tracking server reinstall/reboot activity across a fleet of dedicated servers.

## What do I need to use this integration?

You need an OVHcloud account with one or more Dedicated Servers, and either:
* An OVHcloud application key, application secret, and consumer key (HMAC-SHA1 authentication, recommended — no separate IAM service account setup required), or
* An OVHcloud IAM service account (client ID and client secret, OAuth2 `client_credentials`)

The consumer key (or IAM service account policy) must be scoped to `GET /dedicated/server` and `GET /dedicated/server/*`.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html). You can install only one Elastic Agent per host.

Elastic Agent is required to stream data from the syslog or log file receiver and ship the data to Elastic, where the events will then be processed via the integration's ingest pipelines.

{{/* If agentless is available for this integration, include the following section. You can determine if agentless is available for this integration by checking the `manifest.yml` file, and looking for the existence of `policy_templates.deployment_modes.agentless.enabled: "true"`.
### Agentless deployment

Agentless deployments are only supported in Elastic Serverless and Elastic Cloud environments. Agentless deployments provide a means to ingest data while avoiding the orchestration, management, and maintenance needs associated with standard ingest infrastructure. Using an agentless deployment makes manual agent deployment unnecessary, allowing you to focus on your data instead of the agent that collects it.

For more information, refer to [Agentless integrations](https://www.elastic.co/guide/en/serverless/current/security-agentless-integrations.html) and [Agentless integrations FAQ](https://www.elastic.co/guide/en/serverless/current/agentless-integration-troubleshooting.html) 
*/}}

### Set up steps in ovh_dedicated_servers

1. **HMAC-SHA1 (recommended):** register an OVH application at the regional `createApp` URL (e.g. `https://eu.api.ovh.com/createApp/`) to obtain an application key and application secret. Then call `POST /auth/credential` with an `accessRules` body scoped to `GET /dedicated/server` and `GET /dedicated/server/*`, and validate the returned URL in a browser to obtain a consumer key.
2. **OAuth2 (alternative):** in the OVHcloud Control Panel, go to IAM → Service Accounts, create a service account, and note the client ID and client secret. Assign a policy granting read access to the account's dedicated-server resources.

#### Vendor resources
- [OVH API Console](https://api.ovh.com/console/#/dedicated/server)
- [OVH createApp (application key/secret registration)](https://eu.api.ovh.com/createApp/)
- [OVHcloud Bare Metal product page](https://www.ovhcloud.com/en/bare-metal/)

### Set up steps in Kibana

1. In Kibana, go to **Integrations** and search for "OVHcloud Dedicated Servers".
2. Add the integration and select an agent policy.
3. Configure the API base URL for your OVH region and your authentication credentials (application key/secret/consumer key, or OAuth2 client ID/secret).
4. Configure the polling interval for each data stream (defaults: `5m` for task/log, `15m` for intervention, `1h` for backup_acl).
5. Save and deploy the integration to the selected agent policy.

### Validation

After deployment, verify data is flowing by checking the `logs-ovh_dedicated_servers.*` data streams in Kibana's **Discover** view. Task events should appear after any async operation is performed against a dedicated server (e.g. a reboot or reinstall); intervention and log entries depend on account/server activity history; backup_acl entries only appear for servers that have the backup-FTP feature activated.

## Troubleshooting

- 403 Forbidden with errorCode NOT_GRANTED_CALL: the consumer key (or IAM service account policy) is not scoped to `GET /dedicated/server` and `GET /dedicated/server/*`. Recreate the credential with the correct access rules.
- 403 Forbidden "This credential is not valid": the consumer key was never validated in a browser after being requested, or was created for a different regional API endpoint (EU/CA/US) than the one configured.
- No task, intervention, or backup_acl events: these streams only emit documents when there is corresponding activity or configuration on the account (e.g. no data if no async operations have run recently, or if the backup-FTP feature was never activated on a given server). This is expected, not an error.
- No data at all: verify the configured API base URL matches your account's region and that outbound HTTPS (443) connectivity to that host is allowed from the Elastic Agent host.

## Performance and scaling
{{/* Add any vendor specific performance and scaling information to this section.
Performance and scaling information should be specific to sending data to Elasticsearch. It should not include information about the vendor product itself or generic information about performance and scaling.
*/}}
For more information on architectures that can be used for scaling this integration, check the [Ingest Architectures](https://www.elastic.co/docs/manage-data/ingest/ingest-reference-architectures) documentation.

## Reference

### Inputs used
{{/* All inputs used by this package will be automatically listed here. Do not modify this section. */}}
{{ inputDocs }}

### API usage
These APIs are used with this integration:
* `GET /dedicated/server` — list owned dedicated server service names
* `GET /dedicated/server/{serviceName}/task` and `/task/{taskId}` — task history
* `GET /dedicated/server/{serviceName}/intervention` and `/plannedIntervention` (plus `/{id}` detail) — hardware intervention history
* `GET /dedicated/server/log` — account-wide provisioning/activity log
* `GET /dedicated/server/{serviceName}/features/backupFTP/access` and `/{ipBlock}` — backup-FTP ACL entries

### Vendor documentation links
- [OVH API Console — Dedicated Server](https://api.ovh.com/console/#/dedicated/server)
- [OVH API machine-readable schema](https://eu.api.ovh.com/1.0/dedicated/server.json)
- [OVHcloud Bare Metal product page](https://www.ovhcloud.com/en/bare-metal/)

### Data streams

#### task

The `task` data stream provides the async task/job history for each OVHcloud dedicated server: reinstalls, reboots, IPMI/KVM access requests and resets, firewall enable/disable, backup-FTP ACL changes, RIPE organization changes, floating-IP/virtual-MAC moves, and hardware updates.

##### task fields

{{ fields "task" }}

##### task sample event

{{ event "task" }}

#### intervention

The `intervention` data stream provides past and scheduled hardware intervention/incident history for each OVHcloud dedicated server.

##### intervention fields

{{ fields "intervention" }}

##### intervention sample event

{{ event "intervention" }}

#### log

The `log` data stream provides an account-wide, human-readable feed of server provisioning/activity milestones (installs, reboots, network incident notices).

##### log fields

{{ fields "log" }}

##### log sample event

{{ event "log" }}

#### backup_acl

The `backup_acl` data stream provides a current-state snapshot of backup-FTP IP allow-list entries for each OVHcloud dedicated server that has the backup-FTP feature activated.

##### backup_acl fields

{{ fields "backup_acl" }}

##### backup_acl sample event

{{ event "backup_acl" }}

{{/* Export ILM Policies
     This accepts a list of data stream names as arguments, and will export the ILM Policies
     for each given data stream name. If no arguments are provided, all ILM Policies will be
     exported.

     If there are no ILM Policies defined, this will be an empty string.
*/}}
{{ ilm }}

{{/* Export Transforms
     This will export the transforms used by this integration.
     If there are no transforms defined, this will be an empty string.
*/}}
{{ transform }}
