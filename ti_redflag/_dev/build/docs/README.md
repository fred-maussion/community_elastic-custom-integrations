{{/*
This template can be used as a starting point for writing documentation for your new integration. For each section, fill in the details
described in the comments.

Find more detailed documentation guidelines in https://www.elastic.co/docs/extend/integrations/documentation-guidelines
*/}}
# Red Flag Domains Integration for Elastic

## Overview

The Red Flag Domains integration for Elastic enables the collection, processing, and enrichment of suspicious newly registered domains (NRDs). The feed is provided by the [Red Flag Domains](https://red.flag.domains/) project, which identifies NRDs that have a high probability of being used for malicious purposes like phishing or malware distribution.

This integration allows you to ingest this valuable threat intelligence directly into your Elastic Security solution. It facilitates key security use cases such as threat hunting, alert enrichment, and creating detection rules based on suspicious domain activity.

### Compatibility

This integration is compatible with any environment that can run the Elastic Agent and has network connectivity to `https://dl.red.flag.domains`. No specific third-party software or hardware is required.

### How it works

The Elastic Agent uses the Common Event Language (CEL) input to periodically poll the Red Flag Domains feeds. Most polls fetch the lightweight daily diff feed (only domains added in the last day); a full-feed reconciliation pass runs automatically on a longer interval (governed by the **Full Feed Reconciliation Interval** setting) as a safety net for anything the daily diff missed. Each domain is processed into an ECS-compliant threat indicator document, and a deterministic document ID (derived from the domain name) ensures a domain is only ever indexed once, regardless of which fetch observed it first — this is what allows `threat.indicator.first_seen` to reflect the date the domain was actually first seen, rather than being reset on every poll.

## What data does this integration collect?

The Red Flag Domains integration collects a list of domain names. Each domain is processed into an ECS-compliant threat intelligence document with the following key fields:
*   `threat.feed.name`: Set to `Red Flag Domains`.
*   `threat.indicator.type`: The suspicious domain name.
*   `threat.indicator.name`: The suspicious domain name.
*   `threat.indicator.url.domain`: Set to `message`.
*   `threat.indicator.first_seen`: The date this integration first observed the domain. This is set once, when the domain is first indexed, and is never overwritten on later polls. Note this reflects when *this integration* first saw the domain, which for domains missed by the daily diff feed may lag their true addition date by up to the full-feed reconciliation interval. `threat.indicator.last_seen` is not populated.

### Supported use cases

Installing this integration enables the following security use cases:

*   **Threat Intelligence Enrichment:** Correlate network logs (firewall, DNS, proxy) against this list to identify connections to potentially malicious new domains.
*   **Detection Engineering:** Build detection rules that alert when internal systems communicate with domains from this feed.
*   **Threat Hunting:** Proactively search for historical activity involving these domains to uncover previously undetected threats.
*   **Security Dashboards:** Visualize trends and metrics related to suspicious domain activity in your environment.

## What do I need to use this integration?

*   An active Elastic deployment (Elastic Cloud, Serverless, or self-managed).
*   The Elastic Agent installed on a host.
*   Network access from the Elastic Agent host to `https://dl.red.flag.domains` on port 443 (HTTPS). No API keys or authentication are required.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed to collect data from the Red Flag Domains feed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/install-elastic-agents.html).

### Onboard / configure

1.  From your Elastic deployment, go to **Integrations** and search for "Red Flag Domains".
2.  Click **Add Red Flag Domains**.
3.  On the configuration page, give the integration a name. The default settings for the feed URLs, polling interval, and full-feed reconciliation interval are suitable for most users.
4.  Click **Save and continue**.
5.  Deploy the integration to an existing or new Elastic Agent policy.

### Validation

To validate that the integration is working correctly:

1.  Check the Elastic Agent logs for any errors related to the Red Flag Domains input.
2.  In Kibana, navigate to **Discover**.
3.  In the search bar, filter the data using the query `data_stream.dataset : "ti_redflag.domains"`.
4.  You should see documents appearing with the latest threat indicators from the feed.

## Troubleshooting

For help with Elastic ingest tools, check [Common problems](https://www.elastic.co/guide/en/fleet/current/common-problems.html).

The most common issue with this integration is a lack of network connectivity. Ensure that the host running the Elastic Agent can make an outbound HTTPS connection to `dl.red.flag.domains`. You can test this with a `curl` command from the agent host:
```sh
curl -v https://dl.red.flag.domains/red.flag.domains.txt
```

During each full-feed reconciliation pass, it is expected to see version-conflict errors reported for most domains — this is normal. It means those domains were already indexed by an earlier daily diff fetch (or a previous reconciliation pass), so their existing `threat.indicator.first_seen` value is correctly preserved rather than overwritten.

## Reference

### API usage

This integration makes a simple HTTP GET request to `https://dl.red.flag.domains/red.flag.domains.txt` to download the feed. It does not use a formal API with authentication or complex endpoints.

### Red Flag Domains Feed

The `redflag.domains` data stream provides threat intelligence events from the Red Flag Domains feed. Each event represents a single suspicious domain indicator.

{{event "domains"}}

{{fields "domains"}}