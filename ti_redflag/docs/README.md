
# Red Flag Domains Integration for Elastic

## Overview

The Red Flag Domains integration for Elastic enables the collection, processing, and enrichment of suspicious newly registered domains (NRDs). The feed is provided by the [Red Flag Domains](https://red.flag.domains/) project, which identifies NRDs that have a high probability of being used for malicious purposes like phishing or malware distribution.

This integration allows you to ingest this valuable threat intelligence directly into your Elastic Security solution. It facilitates key security use cases such as threat hunting, alert enrichment, and creating detection rules based on suspicious domain activity.

### Compatibility

This integration is compatible with any environment that can run the Elastic Agent and has network connectivity to `https://dl.red.flag.domains`. No specific third-party software or hardware is required.

### How it works

The Elastic Agent uses the Common Event Language (CEL) input to periodically poll the Red Flag Domains URL. It downloads the plain text feed, processes each line as a separate domain, and sends the data to your Elastic cluster. An ingest pipeline then enriches each domain into a fully ECS-compliant threat indicator document.

## What data does this integration collect?

The Red Flag Domains integration collects a list of domain names. Each domain is processed into an ECS-compliant threat intelligence document with the following key fields:
*   `threat.indicator.domain`: The suspicious domain name.
*   `threat.indicator.provider`: Set to `red.flag.domains`.
*   `threat.indicator.type`: Set to `domain-name`.
*   `event.dataset`: Set to `threat.redflag.domains`.

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
3.  On the configuration page, give the integration a name. The default settings for the feed URL and polling interval are suitable for most users.
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

## Scaling

For more information on architectures that can be used for scaling this integration, check the [Ingest Architectures](https://www.elastic.co/guide/en/ingest/current/ingest-reference-architectures.html) documentation. This integration has a very low performance footprint and a single Elastic Agent can easily handle the data collection.

## Reference

### Red Flag Domains Feed

The `redflag.domains` data stream provides threat intelligence events from the Red Flag Domains feed. Each event represents a single suspicious domain indicator.

An example event for `domains` looks as following:

```json
{
    "input": {
        "type": "cel"
    },
    "agent": {
        "name": "docker-fleet-agent",
        "id": "59eba658-ff10-477b-83f8-2ad6322eaf19",
        "type": "filebeat",
        "ephemeral_id": "9547f0a3-8332-4f9d-b8f2-b36b85a15248",
        "version": "8.15.4"
    },
    "@timestamp": "2025-10-20T10:33:26.348Z",
    "ecs": {
        "version": "8.11.0"
    },
    "data_stream": {
        "namespace": "default",
        "type": "logs",
        "dataset": "ti_redflag.domains"
    },
    "host": {
        "name": "docker-fleet-agent"
    },
    "elastic_agent": {
        "id": "59eba658-ff10-477b-83f8-2ad6322eaf19",
        "version": "8.15.4",
        "snapshot": false
    },
    "threat": {
        "indicator": {
            "confidence": "High",
            "name": "zotero.fr",
            "type": "domain-name",
            "url": {
                "domain": "zotero.fr"
            }
        },
        "feed": {
            "name": "Red Flag Domains"
        }
    },
    "event": {
        "agent_id_status": "verified",
        "ingested": "2025-10-20T10:33:31Z",
        "kind": "enrichment",
        "category": [
            "threat"
        ],
        "type": [
            "indicator"
        ],
        "dataset": "ti_redflag.domains"
    },
    "tags": [
        "red-flag-domains",
        "forwarded"
    ]
}
```

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Date/time when the event originated. This is the date/time extracted from the event, typically representing when the event was generated by the source. If the event source has no original timestamp, this value is typically populated by the first time the event was received by the pipeline. Required field for all events. | date |
| data_stream.dataset | Data stream dataset. | constant_keyword |
| data_stream.namespace | A user defined namespace. Namespaces are useful to allow grouping of data. Many users already organize their indices this way, and the data stream naming scheme now provides this best practice as a default. Many users will populate this field with `default`. If no value is used, it falls back to `default`. Beyond the Elasticsearch index naming criteria noted above, `namespace` value has the additional restrictions:   \* Must not contain `-`   \* No longer than 100 characters | constant_keyword |
| data_stream.type | An overarching type for the data stream. Currently allowed values are "logs" and "metrics". We expect to also add "traces" and "synthetics" in the near future. | constant_keyword |
| ecs.version | ECS version this event conforms to. `ecs.version` is a required field and must exist in all events. When querying across multiple indices -- which may conform to slightly different ECS versions -- this field lets integrations adjust to the schema version of the events. | keyword |
| error.message | Error message. | match_only_text |
| event.category | This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy. `event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory. This field is an array. This will allow proper categorization of some events that fall in multiple categories. | keyword |
| event.dataset | Name of the dataset. If an event source publishes more than one type of log or events (e.g. access log, error log), the dataset is used to specify which one the event comes from. It's recommended but not required to start the dataset name with the module name, followed by a dot, then the dataset name. | keyword |
| event.id | Unique ID to describe the event. | keyword |
| event.ingested | Timestamp when an event arrived in the central data store. This is different from `@timestamp`, which is when the event originally occurred.  It's also different from `event.created`, which is meant to capture the first time an agent saw the event. In normal conditions, assuming no tampering, the timestamps should chronologically look like this: `@timestamp` \< `event.created` \< `event.ingested`. | date |
| event.kind | This is one of four ECS Categorization Fields, and indicates the highest level in the ECS category hierarchy. `event.kind` gives high-level information about what type of information the event contains, without being specific to the contents of the event. For example, values of this field distinguish alert events from metric events. The value of this field can be used to inform how these kinds of events should be handled. They may warrant different retention, different access control, it may also help understand whether the data is coming in at a regular interval or not. | keyword |
| event.type | This is one of four ECS Categorization Fields, and indicates the third level in the ECS category hierarchy. `event.type` represents a categorization "sub-bucket" that, when used along with the `event.category` field values, enables filtering events down to a level appropriate for single visualization. This field is an array. This will allow proper categorization of some events that fall in multiple event types. | keyword |
| input.type | Type of filebeat input. | keyword |
| tags | List of keywords used to tag each event. | keyword |
| threat.feed.description |  | constant_keyword |
| threat.feed.name | Display friendly feed name. | constant_keyword |
| threat.feed.reference | Display the feed reference. | constant_keyword |
| threat.indicator.confidence |  | constant_keyword |
| threat.indicator.name |  | keyword |
| threat.indicator.type | The type of the threat indicator. | constant_keyword |
| threat.indicator.url.domain |  | keyword |


### API usage

This integration makes a simple HTTP GET request to `https://dl.red.flag.domains/red.flag.domains.txt` to download the feed. It does not use a formal API with authentication or complex endpoints.
