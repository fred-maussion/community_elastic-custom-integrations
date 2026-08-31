# OVHcloud IAM

The **OVHcloud IAM** integration collects identity user and personal access token state from the [OVHcloud REST API](https://eu.api.ovh.com/1.0/).

Use this integration to monitor IAM user accounts and their tokens for security compliance, access control auditing, and detecting unauthorized account changes.

## Data streams

### `user`

Collects the state of all IAM identity users on the account, including their status, group membership, and last update time.

**ECS fields**: `user.name`, `user.email`, `user.roles`, `event.created`, `cloud.provider`

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
| cloud.provider | Name of the cloud provider. Example values are aws, azure, gcp, or digitalocean. | keyword |
| data_stream.dataset | Data stream dataset. | constant_keyword |
| data_stream.namespace | Data stream namespace. | constant_keyword |
| data_stream.type | Data stream type. | constant_keyword |
| event.category | This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy. `event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory. This field is an array. This will allow proper categorization of some events that fall in multiple categories. | keyword |
| event.created | `event.created` contains the date/time when the event was first read by an agent, or by your pipeline. This field is distinct from `@timestamp` in that `@timestamp` typically contain the time extracted from the original event. In most situations, these two timestamps will be slightly different. The difference can be used to calculate the delay between your source generating an event, and the time when your agent first processed it. This can be used to monitor your agent's or pipeline's ability to keep up with your event source. In case the two timestamps are identical, `@timestamp` should be used. | date |
| event.dataset | Event dataset. | constant_keyword |
| event.kind | This is one of four ECS Categorization Fields, and indicates the highest level in the ECS category hierarchy. `event.kind` gives high-level information about what type of information the event contains, without being specific to the contents of the event. For example, values of this field distinguish alert events from metric events. The value of this field can be used to inform how these kinds of events should be handled. They may warrant different retention, different access control, it may also help understand whether the data is coming in at a regular interval or not. | keyword |
| event.module | Event module. | constant_keyword |
| event.type | This is one of four ECS Categorization Fields, and indicates the third level in the ECS category hierarchy. `event.type` represents a categorization "sub-bucket" that, when used along with the `event.category` field values, enables filtering events down to a level appropriate for single visualization. This field is an array. This will allow proper categorization of some events that fall in multiple event types. | keyword |
| input.type | Input type. | keyword |
| ovh.iam.user.description | Human-readable description of the user. | keyword |
| ovh.iam.user.group | Primary IAM group of the user (e.g. UNPRIVILEGED, ADMIN). | keyword |
| ovh.iam.user.password_last_update | Timestamp of the last password change. | date |
| ovh.iam.user.status | Account status (OK, DISABLED). | keyword |
| ovh.iam.user.type | Identity type (USER, SERVICE_ACCOUNT). | keyword |
| ovh.iam.user.urn | OVHcloud URN uniquely identifying this identity user. | keyword |
| user.email | User email address. | keyword |
| user.name | Short name or login of the user. | keyword |
| user.name.text | Multi-field of `user.name`. | match_only_text |
| user.roles | Array of user roles at the time of the event. | keyword |


An example event for `user` looks as following:

```json
{
    "@timestamp": "2026-06-12T17:38:31.535Z",
    "cloud": {
        "provider": "ovh"
    },
    "ecs": {
        "version": "9.3.0"
    },
    "event": {
        "category": [
            "iam"
        ],
        "created": "2026-06-12T17:38:31.471Z",
        "dataset": "ovh_iam.user",
        "kind": "state",
        "module": "ovh_iam",
        "type": [
            "info"
        ]
    },
    "ovh": {
        "iam": {
            "user": {
                "description": "A user created for AI endpoints",
                "group": "UNPRIVILEGED",
                "password_last_update": "2026-06-12T17:38:31.531Z",
                "status": "OK",
                "type": "USER",
                "urn": "urn:v1:eu:identity:user:qz2514-ovh/ai-endpoints-user"
            }
        }
    },
    "tags": [
        "forwarded",
        "ovh_iam-user"
    ],
    "user": {
        "email": "ai-endpoints-user@ovhcloud.com",
        "name": "ai-endpoints-user",
        "roles": [
            "UNPRIVILEGED"
        ]
    }
}
```

### `token`

Collects personal access tokens for each IAM user, including creation time, expiry, and last-used timestamp.

**ECS fields**: `user.name`, `event.created`, `cloud.provider`

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
| cloud.provider | Name of the cloud provider. Example values are aws, azure, gcp, or digitalocean. | keyword |
| data_stream.dataset | Data stream dataset. | constant_keyword |
| data_stream.namespace | Data stream namespace. | constant_keyword |
| data_stream.type | Data stream type. | constant_keyword |
| event.category | This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy. `event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory. This field is an array. This will allow proper categorization of some events that fall in multiple categories. | keyword |
| event.created | `event.created` contains the date/time when the event was first read by an agent, or by your pipeline. This field is distinct from `@timestamp` in that `@timestamp` typically contain the time extracted from the original event. In most situations, these two timestamps will be slightly different. The difference can be used to calculate the delay between your source generating an event, and the time when your agent first processed it. This can be used to monitor your agent's or pipeline's ability to keep up with your event source. In case the two timestamps are identical, `@timestamp` should be used. | date |
| event.dataset | Event dataset. | constant_keyword |
| event.kind | This is one of four ECS Categorization Fields, and indicates the highest level in the ECS category hierarchy. `event.kind` gives high-level information about what type of information the event contains, without being specific to the contents of the event. For example, values of this field distinguish alert events from metric events. The value of this field can be used to inform how these kinds of events should be handled. They may warrant different retention, different access control, it may also help understand whether the data is coming in at a regular interval or not. | keyword |
| event.module | Event module. | constant_keyword |
| event.type | This is one of four ECS Categorization Fields, and indicates the third level in the ECS category hierarchy. `event.type` represents a categorization "sub-bucket" that, when used along with the `event.category` field values, enables filtering events down to a level appropriate for single visualization. This field is an array. This will allow proper categorization of some events that fall in multiple event types. | keyword |
| input.type | Input type. | keyword |
| ovh.iam.token.description | Human-readable description of the token. | keyword |
| ovh.iam.token.expires_at | Expiry date of the token (far future if non-expiring). | date |
| ovh.iam.token.last_used | Timestamp of the most recent use of the token. | date |
| ovh.iam.token.name | Name of the personal access token. | keyword |
| user.name | Short name or login of the user. | keyword |
| user.name.text | Multi-field of `user.name`. | match_only_text |


An example event for `token` looks as following:

```json
{
    "@timestamp": "2026-06-19T07:48:14.960Z",
    "cloud": {
        "provider": "ovh"
    },
    "ecs": {
        "version": "9.3.0"
    },
    "event": {
        "category": [
            "iam"
        ],
        "created": "2026-06-12T17:38:44.910Z",
        "dataset": "ovh_iam.token",
        "kind": "state",
        "module": "ovh_iam",
        "type": [
            "info"
        ]
    },
    "ovh": {
        "iam": {
            "token": {
                "description": "API key for Elastic AI endpoints",
                "expires_at": "2106-01-01T00:59:59.999Z",
                "last_used": "2026-06-19T07:48:14.960Z",
                "name": "capg-elastic-ai-key"
            }
        }
    },
    "tags": [
        "forwarded",
        "ovh_iam-token"
    ],
    "user": {
        "name": "ai-endpoints-user"
    }
}
```

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
