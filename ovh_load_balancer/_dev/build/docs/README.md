{{- generatedHeader }}
# OVHcloud Load Balancer

## Overview

The **OVHcloud Load Balancer** integration collects HAProxy access logs from OVHcloud Public Cloud Load Balancers via the [Logs Data Platform (LDP)](https://www.ovhcloud.com/en/logs-data-platform/) OpenSearch API.

OVHcloud Load Balancer is a managed Octavia-based L4/L7 load balancer for Public Cloud. It generates HAProxy access logs for every TCP/HTTP connection, including client IP, bytes transferred, session duration, HTTP method and status code, and termination state. These logs are forwarded to a customer-owned LDP stream via a log subscription, and then consumed from the LDP OpenSearch endpoint by this integration.

### Compatibility

This integration is compatible with OVHcloud Public Cloud Load Balancer (Octavia-based) in all Public Cloud regions. The log kind `haproxy` is the only currently supported kind.

### How it works

The integration queries the LDP OpenSearch API (`POST /<alias>/_search`) on a configurable interval, using a time-cursor to fetch only new log entries since the previous run. HAProxy access logs are indexed, parsed, and mapped to ECS fields.

## What data does this integration collect?

### `haproxy` data stream

Collects HAProxy access log entries for all TCP and HTTP listeners on the Load Balancer. Each event represents a single TCP connection or HTTP request.

**Common fields** (all listener types): client IP and port, bytes read/uploaded, session duration, listener/pool/member/LB IDs, project ID, region, HAProxy termination state.

**Additional HTTP fields** (HTTP and TERMINATED_HTTPS listeners): HTTP method, URL path, status code, HTTP version.

{{ fields "haproxy" }}

{{ event "haproxy" }}

## What do I need to use this integration?

- An OVHcloud account with at least one Public Cloud Load Balancer.
- An active [Logs Data Platform (LDP)](https://www.ovhcloud.com/en/logs-data-platform/) account in the same OVHcloud account.
- An LDP stream configured to receive Load Balancer logs.
- An LDP OpenSearch alias that maps to that stream.
- An LDP API token with read access.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html).

### Set up on OVHcloud

#### Step 1 — Create an LDP stream and alias

1. Log into the [OVHcloud Control Panel](https://www.ovhcloud.com/manager/).
2. Navigate to **Logs Data Platform** and open your LDP account (or create one).
3. Create a new **Data Stream** (e.g., `lb-access-logs`) with indexing enabled.
4. Create an **Alias** (e.g., `lb-alias`) that maps to that stream. Note the alias name — you will enter it as the integration's **LDP OpenSearch Alias** field.

#### Step 2 — Create an LDP API token

1. In your LDP account home page, find the **Configuration** panel and click **API tokens** → **Edit**.
2. Create a new token. Copy the token value — it is shown only once.

#### Step 3 — Subscribe your Load Balancer to the stream

Use the OVHcloud API to create a log subscription:

```bash
POST /cloud/project/{serviceName}/region/{regionName}/loadbalancing/loadbalancer/{loadBalancerId}/log/subscription
{
  "kind": "haproxy",
  "streamId": "<your-ldp-stream-id>"
}
```

You can find available kinds with:
```
GET /cloud/project/{serviceName}/region/{regionName}/loadbalancing/log/kind
```

Refer to the [OVHcloud LB Logs Forwarding guide](https://help.ovhcloud.com/csm/en-public-cloud-load-balancer-logs) for detailed instructions.

#### Step 4 — Configure the integration in Kibana

Add the **OVHcloud Load Balancer** integration and fill in:

| Field | Value |
|---|---|
| LDP Cluster URL | `https://gra1.logs.ovh.com:9200` (Gravelines) — adjust for your region |
| LDP OpenSearch Alias | The alias name you created in Step 1 |
| LDP API Token | The token you created in Step 2 |

### Validation

After deploying, navigate to **Discover** in Kibana and filter on `data_stream.dataset: ovh_load_balancer.haproxy`. You should see log entries appear within one poll interval after the first Load Balancer connections are processed.

## Troubleshooting

- No data collected: Verify the LDP token has read access and the alias name is correct. Confirm the log subscription is active.
- HTTP 401: The LDP token may have been revoked or expired. Create a new token in the LDP account settings.
- HTTP 404: The alias name does not exist in LDP. Check that the alias maps to the stream receiving LB logs.

## Reference

### Inputs used
{{ inputDocs }}

### Vendor documentation links
- [OVHcloud Load Balancer Logs Forwarding](https://help.ovhcloud.com/csm/en-public-cloud-load-balancer-logs)
- [Logs Data Platform Quick Start](https://help.ovhcloud.com/csm/en-logs-data-platform-quick-start)
- [LDP OpenSearch API](https://help.ovhcloud.com/csm/en-logs-data-platform-opensearch-api)
- [Securing LDP APIs with tokens](https://support.us.ovhcloud.com/hc/en-us/articles/29230043669395)

{{ ilm }}
{{ transform }}
