# OVHcloud IAM

The **OVHcloud IAM** integration collects identity user and personal access token state from the [OVHcloud REST API](https://eu.api.ovh.com/1.0/).

Use this integration to monitor IAM user accounts and their tokens for security compliance, access control auditing, and detecting unauthorized account changes.

## Data streams

### `user`

Collects the state of all IAM identity users on the account, including their status, group membership, and last update time.

**ECS fields**: `user.name`, `user.email`, `user.roles`, `event.created`, `cloud.provider`

{{ fields "user" }}

{{ event "user" }}

### `token`

Collects personal access tokens for each IAM user, including creation time, expiry, and last-used timestamp.

**ECS fields**: `user.name`, `event.created`, `cloud.provider`

{{ fields "token" }}

{{ event "token" }}

## Requirements

- OVHcloud service account (IAM → Service Accounts) with an IAM policy granting the following permissions:
  - `account:apiovh:me/identity/user/get`
  - `account:apiovh:me/identity/user/token/get`

## Setup

### 1. Create a service account

1. Log in to the [OVHcloud Control Panel](https://www.ovhcloud.com/manager/).
2. Navigate to **IAM → Service Accounts**.
3. Click **Create a service account**, give it a name (e.g. `elastic-iam-collector`), and save.
4. Note the generated **Client ID** and **Client Secret** — the secret is shown only once.

### 2. Create an IAM policy

1. Navigate to **IAM → Policies** and click **Create a policy**.
2. Give the policy a name (e.g. `elastic-iam-read`).
3. Under **Products**, select **OVHcloud customer account** (this covers all `/me/…` endpoints).
4. Under **Resources**, select **All resources** (or explicitly add your account NIC handle). **This step is mandatory** — leaving resources empty means the policy grants nothing, regardless of what actions are listed.
5. Add the following actions:
   - `account:apiovh:me/identity/user/get`
   - `account:apiovh:me/identity/user/token/get`
6. Save the policy.

### 3. Attach the policy to the service account

1. Open the newly created policy.
2. Under **Identities**, click **Add an identity** and select your service account.
3. Save.

### 4. Configure the integration

In Kibana, add the **OVHcloud IAM** integration and fill in:

| Field | Value |
|---|---|
| OVHcloud API URL | `https://eu.api.ovh.com/1.0` (EU) or `https://ca.api.ovh.com/1.0` (CA) / `https://api.us.ovhcloud.com/1.0` (US) |
| OAuth2 Client ID | Client ID from step 1 |
| OAuth2 Client Secret | Client Secret from step 1 |
| OAuth2 Token URL | `https://www.ovh.com/auth/oauth2/token` (EU) or `https://ca.ovh.com/auth/oauth2/token` (CA) / `https://us.ovhcloud.com/auth/oauth2/token` (US) |

## API usage

- `GET /me/identity/user` — list all IAM user logins
- `GET /me/identity/user/{login}` — get user details
- `GET /me/identity/user/{login}/token` — list token names for a user
- `GET /me/identity/user/{login}/token/{name}` — get token details
