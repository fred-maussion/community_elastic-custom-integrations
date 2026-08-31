{{- generatedHeader }}
# OVHcloud Billing

## Overview

The **OVHcloud Billing** integration collects account profile data and invoice history from OVHcloud via the [OVHcloud REST API](https://api.ovh.com/console/).

OVHcloud is a European cloud provider offering bare metal servers, managed Kubernetes, databases, and more. This integration polls the OVHcloud account management API (`/me`) to collect account details and bill history for cost visibility and audit purposes.

### Compatibility

This integration is compatible with the OVHcloud API v1. Supported regions: EU (`eu.api.ovh.com`), CA (`ca.api.ovh.com`), and US (`api.us.ovhcloud.com`).

### How it works

The integration authenticates with the OVHcloud API using OAuth2 client credentials (service account). It polls:
- `/me` — for account profile information on each interval
- `/me/bill` + `/me/bill/{billId}` — to discover and fetch new invoices, tracking already-seen bill IDs via a cursor

## What data does this integration collect?

### `account` data stream

Collects the OVHcloud account profile (NIC handle, name, email, country, currency, legal form, and OVH subsidiary). Emits one event per poll interval.

**ECS fields set**: `user.name` (NIC handle), `user.email`, `user.full_name`, `cloud.provider`.

{{ fields "account" }}

{{ event "account" }}

### `bill` data stream

Collects invoice/bill records. Each event represents a single invoice with amount, tax, currency, and linked order. New bills are tracked via a cursor of seen bill IDs so each invoice is collected only once.

**ECS fields set**: `event.id` (bill ID), `event.url`, `cloud.provider`.

{{ fields "bill" }}

{{ event "bill" }}

## What do I need to use this integration?

- An OVHcloud account.
- An OVHcloud IAM service account (client ID + client secret) with read access to account and billing data.

## How do I deploy this integration?

### Agent-based deployment

Elastic Agent must be installed. See [installation instructions](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html).

### Set up on OVHcloud

#### Step 1 — Create a service account

1. Log into the [OVHcloud Control Panel](https://www.ovhcloud.com/manager/).
2. Navigate to **IAM** → **Service Accounts** → **Create a service account**.
3. Note the **Client ID** and **Client Secret** (shown only once).
4. Assign an IAM policy granting `GET /me` and `GET /me/bill*` read access.

#### Step 2 — Configure the integration in Kibana

Add the **OVHcloud Billing** integration and provide:

| Field | Value |
|---|---|
| OVHcloud API URL | `https://eu.api.ovh.com/1.0` (EU) |
| OAuth2 Client ID | Your service account client ID |
| OAuth2 Client Secret | Your service account client secret |
| OAuth2 Token URL | `https://www.ovh.com/auth/oauth2/token` (EU) |

### Validation

After deploying, navigate to **Discover** in Kibana and filter on `data_stream.dataset: ovh_billing.account` or `data_stream.dataset: ovh_billing.bill`.

## Troubleshooting

- **HTTP 401**: Verify the client ID and client secret are correct and the service account is active.
- **HTTP 403**: The service account does not have permission to read account or billing data. Check IAM policy assignments.
- **No bills collected**: Confirm the account has at least one bill. New bills are only collected once — clear the cursor state to re-collect all.

## Reference

### Inputs used
{{ inputDocs }}

### Vendor documentation links
- [OVHcloud API Console](https://api.ovh.com/console/)
- [OVHcloud IAM Service Accounts](https://help.ovhcloud.com/csm/en-account-iam-service-accounts)
- [OVHcloud API Authentication](https://help.ovhcloud.com/csm/en-api-getting-started-ovhcloud-api)

{{ ilm }}
{{ transform }}
