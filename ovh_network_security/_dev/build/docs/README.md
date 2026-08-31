{{- generatedHeader }}
# OVHcloud Network Security Integration

## Overview

The OVHcloud Network Security integration collects network security events from the OVHcloud REST API, covering four protection layers built into every OVHcloud IP block:

- **Anti-Hack** — tracks IPs that OVHcloud has auto-blocked on your IP blocks due to outbound abuse (port scanning, brute-force, etc.)
- **Anti-DDoS Mitigation** — tracks IPs currently undergoing volumetric DDoS scrubbing on OVHcloud's VAC infrastructure
- **Anti-Spam** — tracks IPs flagged for outbound spam that have been blocked by OVHcloud
- **IP Firewall** — collects the stateless ACL rules configured on each firewalled IP

All data streams poll the OVHcloud IP management API on a configurable interval, producing a full snapshot each cycle. Events are enriched with ECS fields and GeoIP/ASN lookups where applicable.

### Compatibility

Compatible with the OVHcloud REST API v1. Tested against the EU region (`https://eu.api.ovh.com/v1`). The CA (`https://ca.api.ovh.com/v1`) and US (`https://us.api.ovh.com/v1`) endpoints use the same API surface and can be substituted via the **API Base URL** configuration field.

Authentication uses OAuth2 `client_credentials` via an OVHcloud IAM Service Account.

### How it works

The integration uses the Elastic Agent CEL input to make authenticated REST API calls against the OVHcloud IP management API. For each data stream, it:

1. Fetches the list of all IP blocks on the account (`GET /ip`)
2. For each IP block, fetches the relevant security sub-resource list (e.g., `GET /ip/{block}/antihack`)
3. For each entry in that list, fetches the detail record
4. For the firewall stream, performs an additional level of fan-out to fetch individual rule details

All requests are authenticated using an OAuth2 Bearer token obtained from the OVHcloud token endpoint using `client_id` and `client_secret` from an IAM Service Account.

## What data does this integration collect?

The OVHcloud Network Security integration collects log messages of the following types:

- **antihack** — records of IPs blocked on your IP blocks due to detected outbound abuse
- **mitigation** — records of IPs currently under active DDoS scrubbing (VAC mitigation)
- **spam** — records of IPs blocked for outbound spam
- **firewall** — stateless firewall ACL rule configurations per IP (protocol, source/destination, port, action)

## What do I need to use this integration?

- An OVHcloud account with one or more IP blocks (dedicated server IPs, Bring Your Own IP blocks, or Public Cloud floating IPs)
- An OVHcloud IAM Service Account with read access to IP resources (see setup steps below)
- Elastic Agent 8.19.0 or later

Note: The `antihack`, `mitigation`, and `spam` data streams will produce no events on a clean account with no active security incidents — this is expected. The `firewall` data stream produces events for any configured firewall rules, which you can create manually in the OVHcloud Control Panel.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. For more details, check the Elastic Agent [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html). You can install only one Elastic Agent per host.

### Set up steps in OVHcloud

#### 1. Create an IAM Service Account

1. Log in to the [OVHcloud Control Panel](https://www.ovh.com/manager/)
2. Navigate to **My Account → IAM → Service Accounts**
3. Click **Create a Service Account**, give it a name (e.g., `elastic-network-security`), and confirm
4. Note the generated **Client ID** and **Client Secret** — the secret is shown only once

#### 2. Create an IAM policy

1. In **IAM → Policies**, click **Create a policy**
2. Name it (e.g., `elastic-network-security-read`)
3. Under **Resources**, select product type **IP:Address** and choose the IP blocks you want to monitor (or select all)
4. Under **Actions**, add the following read-only actions:

   | Action | Purpose |
   |---|---|
   | `ip:apiovh:get` | List IP blocks |
   | `ip:apiovh:antihack/get` | Read anti-hack blocked IPs |
   | `ip:apiovh:mitigation/get` | Read active DDoS mitigations |
   | `ip:apiovh:spam/get` | Read anti-spam blocked IPs |
   | `ip:apiovh:firewall/get` | Read IP firewall rules |

5. Attach the policy to the Service Account created in step 1

#### Vendor resources

- [OVHcloud IAM — Service Accounts](https://help.ovhcloud.com/csm/en-manage-service-account?id=kb_article_view&sysparm_article=KB0059343)
- [OVHcloud IAM — Policies](https://help.ovhcloud.com/csm/en-iam-policy-ui?id=kb_article_view&sysparm_article=KB0059835)
- [OVHcloud IP Anti-Hack documentation](https://help.ovhcloud.com/csm/en-dedicated-servers-ip-antihack?id=kb_article_view&sysparm_article=KB0043418)
- [OVHcloud IP Firewall documentation](https://help.ovhcloud.com/csm/en-dedicated-servers-firewall-network?id=kb_article_view&sysparm_article=KB0043471)
- [OVHcloud API reference — /ip](https://eu.api.ovh.com/console/?section=%2Fip)

### Set up steps in Kibana

1. In Kibana, navigate to **Integrations → OVHcloud Network Security** and click **Add OVHcloud Network Security**
2. Configure the required fields:
   - **API Base URL**: `https://eu.api.ovh.com/v1` (EU), `https://ca.api.ovh.com/v1` (CA), or `https://us.api.ovh.com/v1` (US)
   - **OAuth2 Client ID**: the Client ID from the IAM Service Account
   - **OAuth2 Client Secret**: the Client Secret from the IAM Service Account
   - **OAuth2 Token URL**: `https://www.ovh.com/auth/oauth2/token`
3. Enable or disable individual data streams as needed
4. Set the collection interval (default: 5 minutes)
5. Click **Save and Deploy**

### Validation

After deploying the integration, verify data is flowing:

1. In Kibana **Discover**, filter by `event.dataset: ovh_network_security.firewall` — firewall rules appear immediately if any are configured
2. For `antihack`, `mitigation`, and `spam`, data only appears when OVHcloud has active security events on your IP blocks
3. Check **Fleet → Agents** for any agent errors if no data appears after the first collection interval

## Troubleshooting

- No data collected, authentication error in agent logs: verify the Client ID and Client Secret are correct, the token URL matches your region, and the IAM policy is attached to the Service Account
- `firewall` data stream returns no events: ensure at least one IP on your account has the OVH firewall enabled and at least one rule configured (Control Panel → Network Security → IP Firewall)
- Empty results for antihack/mitigation/spam: this is normal on accounts with no active security incidents — the API returns an empty list
- Incorrect region: the EU token URL (`https://www.ovh.com/auth/oauth2/token`) may not work for CA/US regions — use the region-specific token URL if authentication fails

## Reference

### Inputs used

{{ inputDocs }}

### API usage

These APIs are used with this integration:

| Endpoint | Data stream | Purpose |
|---|---|---|
| `GET /ip` | all | List all IP blocks on the account |
| `GET /ip/{block}/antihack` | antihack | List IPs blocked for outbound abuse |
| `GET /ip/{block}/antihack/{ip}` | antihack | Detail for a blocked IP |
| `GET /ip/{block}/mitigation` | mitigation | List IPs under active DDoS scrubbing |
| `GET /ip/{block}/mitigation/{ip}` | mitigation | Mitigation detail for an IP |
| `GET /ip/{block}/spam` | spam | List IPs blocked for outbound spam |
| `GET /ip/{block}/spam/{ip}` | spam | Spam detail for an IP |
| `GET /ip/{block}/firewall` | firewall | List IPs with firewall enabled |
| `GET /ip/{block}/firewall/{ip}/rule` | firewall | List firewall rule sequences for an IP |
| `GET /ip/{block}/firewall/{ip}/rule/{seq}` | firewall | Detail for a specific firewall rule |

### Vendor documentation links

- [OVHcloud API reference](https://eu.api.ovh.com/console/?section=%2Fip)
- [OVHcloud Network Security overview](https://www.ovhcloud.com/en/security/)
- [OVHcloud IAM documentation](https://help.ovhcloud.com/csm/en-iam-policy-ui?id=kb_article_view&sysparm_article=KB0059835)

### Data streams

#### antihack

The `antihack` data stream collects records of IPv4 addresses that OVHcloud has automatically blocked on your IP blocks due to detected outbound abuse activity (port scanning, brute-force attacks, etc.). Each event represents one blocked IP within one of your CIDR blocks.

##### antihack fields

{{ fields "antihack" }}

##### antihack sample event

{{ event "antihack" }}

#### mitigation

The `mitigation` data stream collects records of IPv4 addresses currently undergoing active anti-DDoS scrubbing on OVHcloud's VAC (Vacuum) mitigation infrastructure. Each event represents one IP under active mitigation within one of your CIDR blocks.

##### mitigation fields

{{ fields "mitigation" }}

##### mitigation sample event

{{ event "mitigation" }}

#### spam

The `spam` data stream collects records of IPv4 addresses that OVHcloud has blocked for sending outbound spam. Each event represents one flagged IP within one of your CIDR blocks.

##### spam fields

{{ fields "spam" }}

##### spam sample event

{{ event "spam" }}

#### firewall

The `firewall` data stream collects the stateless ACL rules configured on OVHcloud IP Firewall for each firewalled IP on your account. Each event represents one firewall rule (up to 20 rules per IP, sequence 0–19). Rules are collected as a full snapshot on each poll interval.

##### firewall fields

{{ fields "firewall" }}

##### firewall sample event

{{ event "firewall" }}

{{ ilm }}

{{ transform }}
