# Tools

This folder contains helper scripts used to develop, test, and seed data for the custom Elastic integrations in this repository. These tools are **not part of the integration packages** — they exist to support development and QA workflows.

## Structure

```
tools/
  <integration_name>/
    scripts/      # one or more Python scripts
```

## Available tools

### gitguardian

| Script | Purpose |
|---|---|
| `gitguardian/scripts/gg_seed_data.py` | Creates GitHub repositories and pushes commits containing fake-but-detector-triggering secrets so GitGuardian scans them and generates incidents that flow into the `internal_secret_alert`, `secret_occurrence`, and `audit_log` data streams. Useful for end-to-end testing of the integration without waiting for real incidents. |

#### gg_seed_data.py — quick start

```bash
pip install requests

# Step 1: create fake GitHub repos
export GITHUB_TOKEN=ghp_...
python tools/gitguardian/scripts/gg_seed_data.py create-repos --prefix gg-seed --count 4

# Step 2: add those repos to GitGuardian perimeter monitoring
#   https://dashboard.gitguardian.com/perimeter

# Step 3: push secret-containing commits
python tools/gitguardian/scripts/gg_seed_data.py feed-repos --prefix gg-seed --commits 10

# Step 4: clean up
python tools/gitguardian/scripts/gg_seed_data.py delete-repos --prefix gg-seed
```

Requires a GitHub PAT with `repo` scope (classic) or Administration + Contents read/write (fine-grained). See the script header for full token permission details.
