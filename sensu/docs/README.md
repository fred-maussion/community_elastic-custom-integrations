# Sensu Integration

The Sensu integration allows you to monitor your observability stack using Sensu. Sensu is a flexible, scalable monitoring and observability platform that provides health checks, metrics collection, and incident management for applications and infrastructure.

Use the Sensu integration to ingest logs and metrics from Sensu into Elasticsearch. Then visualize that data in Kibana, create alerts to notify you of critical events, and troubleshoot issues with detailed insights.

For example, if you wanted to monitor the health of your infrastructure and receive alerts when specific services fail, you could configure Sensu to send health check data to Elasticsearch. Then you can visualize trends in Kibana dashboards, set up alerts to notify your team, and debug incidents using the collected logs.

## Data streams

The Sensu integration collects two types of data streams: logs and metrics.

**Logs** help you keep a record of events happening in Sensu.  
Log data streams collected by the Sensu integration include:
- Backend logs events

See more details in the [Logs](#logs-reference).

## Requirements

You need Elasticsearch for storing and searching your data and Kibana for visualizing and managing it.  
You can use our hosted Elasticsearch Service on Elastic Cloud, which is recommended, or self-manage the Elastic Stack on your own hardware.

Other requirements:
- Sensu backend version 6.x or later
- Permissions to access Sensu logs and metrics
- A configured API key or token to authenticate with Sensu's event data

## Setup

1. Ensure that Sensu is set up and running on your infrastructure.
2. Install the Sensu integration package in your Elastic Stack.
3. Configure Sensu to forward logs to Elasticsearch using a suitable handler or exporter.
4. Verify that data is flowing into Elasticsearch and appears in Kibana.

For step-by-step instructions on how to set up an integration, see the  
[Getting started](https://www.elastic.co/guide/en/welcome-to-elastic/current/getting-started-observability.html) guide.

## Logs reference

### Sensu Logs

The `sensu.log` data stream provides events from Sensu components, such as:
- Health check results
- Error messages
- System events

#### Example

An example event for `sensu-backend.log` looks as follows:

```json
{
  "@timestamp": "2024-11-28T14:37:02Z",
  "event.original": "Nov 28 14:37:02 dp063app0156 sensu-backend[22907]: {\"check\":\"healthcheck_technique_identity_server_3\",\"level\":\"error\",\"msg\":\"unable to substitute tokens\",\"time\":\"2024-11-28T14:37:02Z\"}",
  "event.action": "healthcheck_technique_identity_server_3",
  "log.level": "error",
  "host.name": "dp063app0156",
  "process.name": "sensu-backend",
  "process.pid": 22907,
  "message": "unable to substitute tokens"
}

