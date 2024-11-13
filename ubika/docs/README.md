# Ubika Application Security

The Ubika Application Security integration allows you to monitor the Ubika WAAP (Web Application and API Protection) Gateway. Ubika WAAP is an advanced security solution designed to protect web applications and APIs from cyber threats, including SQL injection, XSS, and DDoS attacks.

Use the Ubika Application Security integration to collect and analyze security event data from Ubika WAAP. With this integration, you can visualize data in Kibana, set up alerts to notify you of suspicious activity, and troubleshoot issues by referencing collected logs.

For example, if you wanted to monitor for potential DDoS attacks, you could set an alert on request traffic spikes. Then you can visualize these events in Kibana, alert on anomalous patterns, and troubleshoot using detailed log data.

## Data streams

The Ubika Application Security integration collects one type of data stream: logs.

**Logs** capture a record of security events and traffic patterns processed by Ubika WAAP, such as:
- Threat detection events (e.g., SQL injections, XSS attempts)
- DDoS attack patterns
- API access and request logs

See the [Logs](#logs-reference) section for more details on these data streams.

## Requirements

- **Elasticsearch** is required for storing and searching the collected data.
- **Kibana** is necessary for visualizing and managing the data.
- This integration is compatible with Elastic Cloud (recommended) or a self-managed Elastic Stack deployment.
  
Additional requirements:
- **Ubika WAAP Gateway** must be configured to send logs to Elasticsearch.
- Ensure necessary permissions to view and access WAAP logs in Elasticsearch and Kibana.
  
## Setup

1. Follow the [Getting started](https://www.elastic.co/guide/en/welcome-to-elastic/current/getting-started-observability.html) guide to set up your Elastic Stack.

2. Configure Ubika WAAP to forward its log data to Elasticsearch:
   - Locate the log forwarding settings in the Ubika WAAP Gateway.
   - Set the destination to your Elastic-agent instance.
   - Verify that log formats are compatible with the Elastic integration.

3. In Kibana, set up alerts and visualizations as needed to monitor your security environment.

## Logs reference

### Threat Detection Logs

The `threat_detection` data stream provides logs for various types of attacks detected by Ubika WAAP, including:
- SQL injection attempts
- Cross-site scripting (XSS) events
- DDoS attack indicators

#### Example

An example event for `threat_detection` may look as follows:

```json
{
  "timestamp": "2024-11-13T12:34:56Z",
  "event_type": "threat_detection",
  "threat_type": "SQL Injection",
  "severity": "high",
  "source_ip": "192.168.1.100",
  "target": "/api/user",
  "details": "SQL Injection attempt detected in API request payload"
}
```