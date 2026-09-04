#!/usr/bin/env python3
"""
gg_seed_data.py — GitGuardian test-data seeder
===============================================

Creates GitHub repositories and populates them with commits containing
fake-but-detector-triggering secrets, so GitGuardian scans the git history
and generates incidents that flow into the Elastic integration data streams
(internal_secret_alert, secret_occurrence, audit_log, …).

────────────────────────────────────────────────────────────────────────────
REQUIREMENTS
────────────────────────────────────────────────────────────────────────────
  • Python 3.8+
  • git CLI on your PATH
  • requests library:   pip install requests
  • GitHub Personal Access Token (see TOKEN PERMISSIONS below)

────────────────────────────────────────────────────────────────────────────
TOKEN PERMISSIONS
────────────────────────────────────────────────────────────────────────────
  The script creates repos, clones them, pushes commits, lists repos, and
  deletes repos.  Generate your token at:
    https://github.com/settings/tokens

  Classic PAT  (Settings → Developer settings → Tokens (classic))
  ───────────────────────────────────────────────────────────────
    Scope required:  repo  (full control of private repositories)
    This single scope covers create, clone, push, list, and delete.
    If you only use public repos (--public flag), public_repo is enough.

  Fine-grained PAT  (Settings → Developer settings → Fine-grained tokens)
  ─────────────────────────────────────────────────────────────────────────
    Resource owner:      your user account (or org for --owner my-org)
    Repository access:   All repositories  ← required because repos are
                         created after the token is issued
    Permissions needed:
      • Repository → Administration   Read & write  (create / delete repos)
      • Repository → Contents         Read & write  (clone / push commits)
      • Repository → Metadata         Read          (auto-granted, required)

    Note: if the resource owner is a GitHub organisation, an org admin must
    first allow fine-grained tokens under:
      Org Settings → Personal access token policies

────────────────────────────────────────────────────────────────────────────
WORKFLOW
────────────────────────────────────────────────────────────────────────────

  Step 1 — Create fake repos
  ──────────────────────────
    export GITHUB_TOKEN=ghp_...
    python gg_seed_data.py create-repos --prefix gg-seed --count 4

  Repos created: gg-seed-backend, gg-seed-infra, gg-seed-auth, gg-seed-payments
  Use --owner my-org to create repos inside a GitHub organisation.

  Step 2 — Add repos to GitGuardian
  ───────────────────────────────────
  1. Go to https://dashboard.gitguardian.com/perimeter
  2. Add your GitHub account / organisation as a source (if not done yet).
  3. The new repos will appear — make sure they are monitored.
  4. Trigger a history scan from the Perimeter page for each repo,
     or wait for the nightly scan.

  Step 3 — Feed secrets into git history
  ───────────────────────────────────────
    python gg_seed_data.py feed-repos --prefix gg-seed --commits 10

  This clones each matching repo, pushes --commits commits containing fake
  secrets embedded in realistic source files, then removes the local clone.

  Secret types planted per repo:
    AWS keys            AKIA… + 40-char secret
    GitHub PAT          ghp_… 36-char token
    Stripe secret key   sk_live_…
    MongoDB URI         mongodb+srv://user:pass@cluster…
    PostgreSQL DSN      postgresql://user:pass@host/db
    SendGrid API key    SG.…
    SMTP credentials    smtp://user:pass@smtp.example.com
    JWT secret          plain high-entropy string in code
    Slack webhook       https://hooks.slack.com/services/…
    RSA private key     full PEM block
    LDAP credentials    bind DN + password
    Generic high-entropy  36-char base64-ish string

  Secrets are embedded naturally inside .py, .js, .env, .yml, .tf, .go,
  .sh, .json files — not as bare strings — so they match GitGuardian's
  detector regex patterns.

  Step 4 — Verify detections in GitGuardian
  ──────────────────────────────────────────
  Go to https://dashboard.gitguardian.com/incidents/secrets
  Incidents appear within a few minutes of the history scan completing.

  Step 5 — Verify Elastic integration data streams
  ─────────────────────────────────────────────────
  Once GitGuardian has incidents, the Elastic integration's CEL inputs poll
  on the next 1-minute cycle and populate:
    logs-gitguardian.internal_secret_alert-default
    logs-gitguardian.secret_occurrence-default
    logs-gitguardian.audit_log-default

  Check in Kibana → Discover, or:
    curl -u user:pass https://<ES_URL>/logs-gitguardian.*-default/_count

  Step 6 — Clean up
  ──────────────────
    python gg_seed_data.py clean-repos --prefix gg-seed --dry-run  # preview
    python gg_seed_data.py clean-repos --prefix gg-seed            # delete

────────────────────────────────────────────────────────────────────────────
COMMANDS & OPTIONS
────────────────────────────────────────────────────────────────────────────

  create-repos
    --token TOKEN     GitHub PAT (or set GITHUB_TOKEN env var)
    --owner OWNER     GitHub user or org (default: auto-detect from token)
    --prefix PREFIX   Repo name prefix (default: gg-seed)
    --count N         Number of repos to create (default: 3)
    --private         Create private repos (default)
    --public          Create public repos

  feed-repos
    --token TOKEN     GitHub PAT (or set GITHUB_TOKEN env var)
    --owner OWNER     GitHub user or org (default: auto-detect)
    --prefix PREFIX   Target repos matching {prefix}-* (default: gg-seed)
    --repos NAMES     Explicit comma-separated repo names (overrides --prefix)
    --commits N       Commits per repo (default: 8)
    --branch BRANCH   Branch to push to (default: main)
    --seed N          RNG seed for reproducible runs
    --verbose / -v    Print git commands, API calls, and full tracebacks

  clean-repos
    --token TOKEN     GitHub PAT (or set GITHUB_TOKEN env var)
    --owner OWNER     GitHub user or org (default: auto-detect)
    --prefix PREFIX   Delete repos matching {prefix}-* (default: gg-seed)
    --dry-run         List repos that would be deleted without deleting
    --verbose / -v    Print API calls made during repo discovery

  readme              Print this documentation and exit.

────────────────────────────────────────────────────────────────────────────
Dependencies: requests (pip install requests) + git CLI on PATH
"""

README = __doc__

import argparse
import os
import random
import string
import subprocess
import sys
import tempfile
import textwrap
from typing import List, Optional, Tuple

try:
    import requests
except ImportError:
    sys.exit("requests is required: pip install requests")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REPO_SUFFIXES = [
    "backend", "infra", "auth", "payments", "data-pipeline",
    "api-gateway", "ml-service", "scheduler", "notifications", "analytics",
    "reporting", "billing", "identity", "search", "webhooks",
]

GH_API = "https://api.github.com"


# ---------------------------------------------------------------------------
# Fake secret generators
# ---------------------------------------------------------------------------

def _rand(chars: str, n: int, rng: random.Random) -> str:
    return "".join(rng.choices(chars, k=n))


def _alphanum(n: int, rng: random.Random) -> str:
    return _rand(string.ascii_letters + string.digits, n, rng)


def _upper_alpha(n: int, rng: random.Random) -> str:
    return _rand(string.ascii_uppercase + string.digits, n, rng)


def _b64chars(n: int, rng: random.Random) -> str:
    chars = string.ascii_letters + string.digits + "+/"
    return _rand(chars, n, rng)


def gen_aws_key(rng: random.Random) -> Tuple[str, str]:
    key_id = "AKIA" + _upper_alpha(16, rng)
    secret = _b64chars(40, rng)
    return key_id, secret


def gen_github_pat(rng: random.Random) -> str:
    return "ghp_" + _alphanum(36, rng)


def gen_stripe_key(rng: random.Random) -> str:
    return "sk_live_" + _alphanum(32, rng)


def gen_mongo_uri(rng: random.Random) -> str:
    user = _alphanum(8, rng)
    pwd  = _alphanum(12, rng)
    host = _alphanum(6, rng)
    return f"mongodb+srv://{user}:{pwd}@{host}.mongodb.net/production?retryWrites=true&w=majority"


def gen_postgres_dsn(rng: random.Random) -> str:
    user = _alphanum(6, rng)
    pwd  = _alphanum(14, rng)
    host = _alphanum(8, rng)
    return f"postgresql://{user}:{pwd}@{host}.db.example.com:5432/appdb"


def gen_sendgrid_key(rng: random.Random) -> str:
    part1 = _alphanum(20, rng)
    part2 = _alphanum(43, rng)
    return f"SG.{part1}.{part2}"


def gen_smtp_url(rng: random.Random) -> str:
    user = _alphanum(8, rng)
    pwd  = _alphanum(16, rng)
    return f"smtp://{user}:{pwd}@smtp.gmail.com:587"


def gen_high_entropy(rng: random.Random) -> str:
    return _b64chars(38, rng)


def gen_jwt_secret(rng: random.Random) -> str:
    return _b64chars(48, rng)


def gen_slack_webhook(rng: random.Random) -> str:
    t = _upper_alpha(9, rng)
    b = _upper_alpha(9, rng)
    x = _alphanum(24, rng)
    return f"https://hooks.slack.com/services/T{t}/B{b}/{x}"


def gen_rsa_key_block(rng: random.Random) -> str:
    body = _b64chars(64, rng)
    mid  = _b64chars(64, rng)
    tail = _b64chars(32, rng) + "g4wA="
    return (
        "-----BEGIN RSA PRIVATE KEY-----\n"
        f"{body}\n{mid}\n{tail}\n"
        "-----END RSA PRIVATE KEY-----"
    )


def gen_ldap_creds(rng: random.Random) -> Tuple[str, str]:
    user = "cn=admin,dc=example,dc=com"
    pwd  = "%" + _alphanum(6, rng) + "@" + _alphanum(4, rng) + "8=H_"
    return user, pwd


# ---------------------------------------------------------------------------
# File content templates
# Each template returns (filename, content, secret_labels[])
# ---------------------------------------------------------------------------

def tmpl_python_aws(rng: random.Random):
    key_id, secret = gen_aws_key(rng)
    content = textwrap.dedent(f"""\
        # AWS S3 uploader — DO NOT COMMIT credentials
        import boto3

        AWS_ACCESS_KEY_ID = "{key_id}"
        AWS_SECRET_ACCESS_KEY = "{secret}"
        AWS_DEFAULT_REGION = "us-east-1"


        def get_s3_client():
            return boto3.client(
                "s3",
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            )
    """)
    return "aws_client.py", content, ["AWS keys"]


def tmpl_python_db(rng: random.Random):
    mongo = gen_mongo_uri(rng)
    content = textwrap.dedent(f"""\
        # Database connection helpers
        import pymongo

        MONGO_URI = "{mongo}"

        def get_db(name="main"):
            client = pymongo.MongoClient(MONGO_URI)
            return client[name]
    """)
    return "db.py", content, ["MongoDB URI"]


def tmpl_python_config(rng: random.Random):
    stripe = gen_stripe_key(rng)
    jwt    = gen_jwt_secret(rng)
    content = textwrap.dedent(f"""\
        # Application configuration
        DEBUG = False
        SECRET_KEY = "{gen_high_entropy(rng)}"

        STRIPE_SECRET_KEY = "{stripe}"
        STRIPE_PUBLISHABLE_KEY = "pk_live_{_alphanum(24, rng)}"

        JWT_SECRET = "{jwt}"
        JWT_ALGORITHM = "HS256"
        JWT_EXPIRY_SECONDS = 3600
    """)
    return "config.py", content, ["Stripe key", "Generic high-entropy secret"]


def tmpl_python_settings(rng: random.Random):
    dsn = gen_postgres_dsn(rng)
    sg  = gen_sendgrid_key(rng)
    content = textwrap.dedent(f"""\
        # Django-style settings
        DATABASES = {{
            "default": {{
                "ENGINE": "django.db.backends.postgresql",
                "NAME": "appdb",
                "USER": "admin",
                "PASSWORD": "{_alphanum(16, rng)}",
                "HOST": "db.prod.internal",
                "PORT": "5432",
            }}
        }}

        DATABASE_URL = "{dsn}"
        SENDGRID_API_KEY = "{sg}"

        EMAIL_HOST = "smtp.sendgrid.net"
        EMAIL_PORT = 587
    """)
    return "settings.py", content, ["PostgreSQL DSN", "SendGrid key"]


def tmpl_env(rng: random.Random):
    key_id, secret = gen_aws_key(rng)
    dsn  = gen_postgres_dsn(rng)
    sg   = gen_sendgrid_key(rng)
    content = textwrap.dedent(f"""\
        # Environment variables — never commit this file
        NODE_ENV=production

        DATABASE_URL={dsn}

        AWS_ACCESS_KEY_ID={key_id}
        AWS_SECRET_ACCESS_KEY={secret}
        AWS_REGION=eu-west-1

        SENDGRID_API_KEY={sg}

        REDIS_URL=redis://:{_alphanum(16, rng)}@redis.prod.internal:6379/0
    """)
    return ".env", content, ["PostgreSQL DSN", "AWS keys", "SendGrid key"]


def tmpl_env_local(rng: random.Random):
    stripe = gen_stripe_key(rng)
    gh_pat = gen_github_pat(rng)
    content = textwrap.dedent(f"""\
        STRIPE_SECRET_KEY={stripe}
        GITHUB_TOKEN={gh_pat}
        NEXT_PUBLIC_API_URL=http://localhost:3000
        LOG_LEVEL=debug
    """)
    return ".env.local", content, ["Stripe key", "GitHub PAT"]


def tmpl_js_config(rng: random.Random):
    mongo = gen_mongo_uri(rng)
    slack = gen_slack_webhook(rng)
    content = textwrap.dedent(f"""\
        // Application config — rotate credentials before production deploy
        module.exports = {{
          mongoUri: "{mongo}",
          slack: {{
            webhook: "{slack}",
          }},
          port: process.env.PORT || 3000,
        }};
    """)
    return "config.js", content, ["MongoDB URI", "Slack webhook"]


def tmpl_js_db(rng: random.Random):
    dsn = gen_postgres_dsn(rng)
    content = textwrap.dedent(f"""\
        const {{ Pool }} = require('pg');

        // TODO: move to env before shipping
        const pool = new Pool({{
          connectionString: "{dsn}",
          ssl: {{ rejectUnauthorized: false }},
        }});

        module.exports = pool;
    """)
    return "db.js", content, ["PostgreSQL DSN"]


def tmpl_js_server(rng: random.Random):
    jwt = gen_jwt_secret(rng)
    stripe = gen_stripe_key(rng)
    content = textwrap.dedent(f"""\
        const express = require('express');
        const app = express();

        const JWT_SECRET = "{jwt}";
        const stripe = require('stripe')("{stripe}");

        app.get('/health', (_, res) => res.json({{ ok: true }}));
        app.listen(3000);
    """)
    return "server.js", content, ["JWT secret", "Stripe key"]


def tmpl_yaml_docker(rng: random.Random):
    dsn = gen_postgres_dsn(rng)
    pwd = _alphanum(20, rng)
    content = textwrap.dedent(f"""\
        version: "3.9"
        services:
          app:
            build: .
            environment:
              - DATABASE_URL={dsn}
              - REDIS_PASSWORD={_alphanum(16, rng)}
          postgres:
            image: postgres:15
            environment:
              - POSTGRES_PASSWORD={pwd}
              - POSTGRES_USER=app
    """)
    return "docker-compose.yml", content, ["PostgreSQL DSN"]


def tmpl_yaml_config(rng: random.Random):
    key_id, secret = gen_aws_key(rng)
    content = textwrap.dedent(f"""\
        # Service configuration
        aws:
          region: us-east-1
          access_key_id: {key_id}
          secret_access_key: {secret}

        database:
          host: db.internal
          port: 5432
          password: {_alphanum(18, rng)}
    """)
    return "config.yml", content, ["AWS keys"]


def tmpl_terraform(rng: random.Random):
    key_id, secret = gen_aws_key(rng)
    content = textwrap.dedent(f"""\
        provider "aws" {{
          region     = "us-east-1"
          access_key = "{key_id}"
          secret_key = "{secret}"
        }}

        resource "aws_s3_bucket" "data" {{
          bucket = "my-app-data-${{var.env}}"
        }}
    """)
    return "main.tf", content, ["AWS keys"]


def tmpl_terraform_vars(rng: random.Random):
    dsn = gen_postgres_dsn(rng)
    smtp = gen_smtp_url(rng)
    content = textwrap.dedent(f"""\
        variable "db_url" {{
          default = "{dsn}"
        }}

        variable "smtp_url" {{
          default = "{smtp}"
        }}
    """)
    return "variables.tf", content, ["PostgreSQL DSN", "SMTP credentials"]


def tmpl_go_config(rng: random.Random):
    key_id, secret = gen_aws_key(rng)
    dsn = gen_postgres_dsn(rng)
    content = textwrap.dedent(f"""\
        package config

        const (
            AWSAccessKeyID     = "{key_id}"
            AWSSecretAccessKey = "{secret}"
            DatabaseDSN        = "{dsn}"
        )
    """)
    return "config.go", content, ["AWS keys", "PostgreSQL DSN"]


def tmpl_go_main(rng: random.Random):
    jwt = gen_jwt_secret(rng)
    content = textwrap.dedent(f"""\
        package main

        import "fmt"

        // jwtSecret signs all tokens — rotate quarterly
        const jwtSecret = "{jwt}"

        func main() {{
            fmt.Println("service starting")
        }}
    """)
    return "main.go", content, ["JWT secret"]


def tmpl_shell_deploy(rng: random.Random):
    key_id, secret = gen_aws_key(rng)
    content = textwrap.dedent(f"""\
        #!/usr/bin/env bash
        set -euo pipefail

        # Deployment script — remove hardcoded creds before open-sourcing
        export AWS_ACCESS_KEY_ID="{key_id}"
        export AWS_SECRET_ACCESS_KEY="{secret}"
        export AWS_DEFAULT_REGION="us-east-1"

        aws s3 sync ./dist s3://my-app-assets/
    """)
    return "deploy.sh", content, ["AWS keys"]


def tmpl_shell_setup(rng: random.Random):
    smtp = gen_smtp_url(rng)
    dsn  = gen_postgres_dsn(rng)
    content = textwrap.dedent(f"""\
        #!/usr/bin/env bash
        # Initial environment setup

        export SMTP_URL="{smtp}"
        export DATABASE_URL="{dsn}"

        echo "Environment configured"
    """)
    return "setup.sh", content, ["SMTP credentials", "PostgreSQL DSN"]


def tmpl_json_config(rng: random.Random):
    gh_pat = gen_github_pat(rng)
    stripe = gen_stripe_key(rng)
    content = textwrap.dedent(f"""\
        {{
          "github": {{
            "token": "{gh_pat}",
            "org": "my-company"
          }},
          "stripe": {{
            "secretKey": "{stripe}",
            "webhookSecret": "whsec_{_alphanum(32, rng)}"
          }},
          "debug": false
        }}
    """)
    return "secrets.json", content, ["GitHub PAT", "Stripe key"]


def tmpl_rsa_key(rng: random.Random):
    block = gen_rsa_key_block(rng)
    content = block + "\n"
    return "id_rsa", content, ["RSA private key"]


def tmpl_ldap(rng: random.Random):
    user, pwd = gen_ldap_creds(rng)
    content = textwrap.dedent(f"""\
        # LDAP configuration
        ldap:
          host: ldap.corp.example.com
          port: 636
          bind_dn: "{user}"
          bind_password: "{pwd}"
          base_dn: "dc=example,dc=com"
    """)
    return "ldap.yml", content, ["LDAP credentials"]


ALL_TEMPLATES = [
    tmpl_python_aws,
    tmpl_python_db,
    tmpl_python_config,
    tmpl_python_settings,
    tmpl_env,
    tmpl_env_local,
    tmpl_js_config,
    tmpl_js_db,
    tmpl_js_server,
    tmpl_yaml_docker,
    tmpl_yaml_config,
    tmpl_terraform,
    tmpl_terraform_vars,
    tmpl_go_config,
    tmpl_go_main,
    tmpl_shell_deploy,
    tmpl_shell_setup,
    tmpl_json_config,
    tmpl_rsa_key,
    tmpl_ldap,
]


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------

def gh_session(token: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    return s


def gh_get_owner(session: requests.Session) -> str:
    r = session.get(f"{GH_API}/user")
    r.raise_for_status()
    return r.json()["login"]


def gh_create_repo(session: requests.Session, owner: str, name: str, private: bool) -> dict:
    payload = {"name": name, "private": private, "auto_init": False}
    # Try org first, fall back to user
    r = session.post(f"{GH_API}/orgs/{owner}/repos", json=payload)
    if r.status_code == 404:
        r = session.post(f"{GH_API}/user/repos", json=payload)
    r.raise_for_status()
    return r.json()


def gh_list_repos(session: requests.Session, owner: str, prefix: str,
                  verbose: bool = False) -> List[str]:
    """List repos owned by `owner` whose names start with `prefix`.

    Uses /user/repos for the authenticated user (returns private repos too),
    and /orgs/{owner}/repos for organisations.  Falls back to the org endpoint
    if the user endpoint returns repos for a different login.
    """
    # Determine the authenticated user's login so we know which endpoint to use
    me = session.get(f"{GH_API}/user")
    me.raise_for_status()
    authed_login = me.json()["login"]

    is_self = (owner.lower() == authed_login.lower())

    results = []
    page = 1
    while True:
        if is_self:
            # /user/repos returns ALL repos (including private) for the
            # authenticated user — /users/{owner}/repos only returns public ones
            url = f"{GH_API}/user/repos"
            params = {"per_page": 100, "page": page, "type": "owner"}
        else:
            # Org or another user — try org endpoint first
            url = f"{GH_API}/orgs/{owner}/repos"
            params = {"per_page": 100, "page": page, "type": "all"}

        r = session.get(url, params=params)

        if r.status_code == 404 and not is_self:
            # Not an org — fall back to public user repos
            r = session.get(
                f"{GH_API}/users/{owner}/repos",
                params={"per_page": 100, "page": page, "type": "all"},
            )

        if verbose:
            print(f"  [verbose] GET {r.url} → {r.status_code}")

        r.raise_for_status()
        data = r.json()
        if not data:
            break

        for repo in data:
            # When using /user/repos, filter to repos actually owned by `owner`
            repo_owner = repo.get("owner", {}).get("login", "")
            if is_self and repo_owner.lower() != owner.lower():
                continue
            if verbose:
                print(f"  [verbose] found repo: {repo['name']} (owner: {repo_owner}, "
                      f"private: {repo.get('private')})")
            if repo["name"].startswith(prefix):
                results.append(repo["name"])
        page += 1
    return results


def gh_delete_repo(session: requests.Session, owner: str, name: str) -> None:
    r = session.delete(f"{GH_API}/repos/{owner}/{name}")
    r.raise_for_status()


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def run(cmd: List[str], cwd: str, check: bool = True, capture: bool = False,
        verbose: bool = False):
    kwargs = {"cwd": cwd, "check": check}
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    elif verbose:
        pass  # let stdout/stderr flow to terminal
    else:
        kwargs["stdout"] = subprocess.DEVNULL
        kwargs["stderr"] = subprocess.DEVNULL
    if verbose:
        print(f"  [verbose] $ {' '.join(cmd)}")
    result = subprocess.run(cmd, **kwargs)
    if verbose and capture:
        print(f"  [verbose] → rc={result.returncode} stdout={result.stdout!r}")
    return result


def git_clone(url: str, dest: str, token: str, verbose: bool = False) -> None:
    auth_url = url.replace("https://", f"https://x-access-token:{token}@")
    flags = [] if verbose else ["--quiet"]
    run(["git", "clone"] + flags + [auth_url, dest], cwd="/tmp", verbose=verbose)


def git_configure(repo_dir: str, verbose: bool = False) -> None:
    run(["git", "config", "user.email", "gg-seed@example.com"], cwd=repo_dir, verbose=verbose)
    run(["git", "config", "user.name", "GG Seed Bot"], cwd=repo_dir, verbose=verbose)
    run(["git", "config", "advice.pushUpdateRejected", "false"], cwd=repo_dir, verbose=verbose)


def git_has_commits(repo_dir: str) -> bool:
    r = run(["git", "rev-parse", "HEAD"], cwd=repo_dir, check=False, capture=True)
    return r.returncode == 0


def git_initial_commit(repo_dir: str, branch: str, verbose: bool = False) -> None:
    readme = os.path.join(repo_dir, "README.md")
    with open(readme, "w") as f:
        f.write("# App\n\nApplication source code.\n")
    run(["git", "add", "README.md"], cwd=repo_dir, verbose=verbose)
    run(["git", "commit", "-m", "Initial commit"], cwd=repo_dir, verbose=verbose)
    current = run(["git", "rev-parse", "--abbrev-ref", "HEAD"],
                  cwd=repo_dir, capture=True).stdout.strip()
    if current != branch:
        run(["git", "branch", "-m", branch], cwd=repo_dir, verbose=verbose)


def git_push(repo_dir: str, branch: str, token: str, remote_url: str,
             verbose: bool = False) -> None:
    auth_url = remote_url.replace("https://", f"https://x-access-token:{token}@")
    run(["git", "remote", "set-url", "origin", auth_url], cwd=repo_dir, verbose=verbose)
    flags = [] if verbose else ["--quiet"]
    run(["git", "push", "-u", "origin", branch] + flags, cwd=repo_dir, verbose=verbose)


def write_file(repo_dir: str, filename: str, content: str) -> None:
    path = os.path.join(repo_dir, filename)
    os.makedirs(os.path.dirname(path) if os.path.dirname(filename) else repo_dir, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_create_repos(args):
    token = args.token or os.environ.get("GITHUB_TOKEN")
    if not token:
        sys.exit("GitHub token required: --token or GITHUB_TOKEN env var")

    session = gh_session(token)
    owner = args.owner or gh_get_owner(session)
    private = not args.public
    count = args.count
    prefix = args.prefix

    print(f"Creating {count} repo(s) for owner: {owner}")

    suffixes = REPO_SUFFIXES[:]
    created = 0

    for i in range(count):
        suffix = suffixes[i % len(suffixes)]
        name = f"{prefix}-{suffix}"
        try:
            repo = gh_create_repo(session, owner, name, private)
            vis = "private" if private else "public"
            print(f"  ✓ Created {name} ({vis}) → {repo['html_url']}")
            created += 1
        except requests.HTTPError as e:
            if e.response.status_code == 422:
                print(f"  ⚠ Skipped {name} (already exists)")
                created += 1  # count it as available
            else:
                print(f"  ✗ Failed to create {name}: {e}")

    print(f"\nDone. Created/found {created}/{count} repos.")
    print(f"\nNext step:")
    print(f"  python gg_seed_data.py feed-repos --prefix {prefix}")


def cmd_feed_repos(args):
    token = args.token or os.environ.get("GITHUB_TOKEN")
    if not token:
        sys.exit("GitHub token required: --token or GITHUB_TOKEN env var")

    verbose = args.verbose
    session = gh_session(token)
    owner = args.owner or gh_get_owner(session)
    branch = args.branch
    commits_per_repo = args.commits
    seed = args.seed

    if verbose:
        print(f"[verbose] owner={owner}, prefix={args.prefix}, commits={commits_per_repo}")

    # Determine target repos
    if args.repos:
        repo_names = [r.strip() for r in args.repos.split(",")]
        if verbose:
            print(f"[verbose] explicit repos: {repo_names}")
    else:
        repo_names = gh_list_repos(session, owner, args.prefix, verbose=verbose)

    if not repo_names:
        print(f"No repos found matching prefix '{args.prefix}' for owner '{owner}'")
        if not verbose:
            print("Tip: re-run with --verbose to see which repos were inspected")
        sys.exit(1)

    print(f"Feeding {len(repo_names)} repo(s) ({commits_per_repo} commits each)\n")

    summary = []

    for repo_name in repo_names:
        repo_url = f"https://github.com/{owner}/{repo_name}.git"
        rng = random.Random(f"{seed}-{repo_name}" if seed is not None else None)
        templates = ALL_TEMPLATES[:]

        print(f"Feeding {repo_name} ({commits_per_repo} commits)...")

        try:
            with tempfile.TemporaryDirectory(prefix="gg-seed-") as tmpdir:
                repo_dir = os.path.join(tmpdir, repo_name)
                os.makedirs(repo_dir)

                # Clone (will be empty for fresh repos)
                if verbose:
                    print(f"  [verbose] cloning {repo_url} → {repo_dir}")
                try:
                    git_clone(repo_url, repo_dir, token, verbose=verbose)
                except subprocess.CalledProcessError as e:
                    if verbose:
                        print(f"  [verbose] clone failed ({e}), initialising empty repo")
                    # repo exists but is empty — init locally
                    run(["git", "init"], cwd=repo_dir, verbose=verbose)

                git_configure(repo_dir, verbose=verbose)

                # Initial commit if empty
                if not git_has_commits(repo_dir):
                    if verbose:
                        print("  [verbose] repo is empty — creating initial commit")
                    git_initial_commit(repo_dir, branch, verbose=verbose)
                    git_push(repo_dir, branch, token, repo_url, verbose=verbose)

                total_secrets = 0
                rng.shuffle(templates)
                tmpl_cycle = list(templates)

                for commit_idx in range(commits_per_repo):
                    # Pick 1–3 templates for this commit
                    n_files = rng.randint(1, min(3, len(tmpl_cycle)))
                    batch = tmpl_cycle[:n_files]
                    tmpl_cycle = tmpl_cycle[n_files:] or list(templates)

                    labels_this_commit = []
                    files_this_commit = []

                    for tmpl_fn in batch:
                        filename, content, labels = tmpl_fn(rng)
                        write_file(repo_dir, filename, content)
                        run(["git", "add", filename], cwd=repo_dir, verbose=verbose)
                        labels_this_commit.extend(labels)
                        files_this_commit.append(filename)
                        total_secrets += len(labels)

                    label_str = ", ".join(labels_this_commit)
                    files_str = ", ".join(files_this_commit)
                    msg = f"update: {files_str}"
                    run(["git", "commit", "-m", msg], cwd=repo_dir, verbose=verbose)

                    print(f"  commit {commit_idx + 1}/{commits_per_repo}: "
                          f"{files_str} [{label_str}]")

                git_push(repo_dir, branch, token, repo_url, verbose=verbose)
                print(f"  ✓ Done — {commits_per_repo} commits pushed, "
                      f"{total_secrets} secrets planted\n")
                summary.append((repo_name, commits_per_repo, total_secrets))

        except Exception as e:
            print(f"  ✗ Error feeding {repo_name}: {e}")
            if verbose:
                import traceback
                traceback.print_exc()
            print()
            summary.append((repo_name, 0, 0))

    # Summary table
    print("Summary:")
    col = max(len(r) for r, *_ in summary)
    for repo_name, n_commits, n_secrets in summary:
        print(f"  {repo_name:<{col}}  {n_commits:>3} commits  {n_secrets:>3} secrets")


def cmd_clean_repos(args):
    token = args.token or os.environ.get("GITHUB_TOKEN")
    if not token:
        sys.exit("GitHub token required: --token or GITHUB_TOKEN env var")

    verbose = args.verbose
    session = gh_session(token)
    owner = args.owner or gh_get_owner(session)
    prefix = args.prefix
    dry_run = args.dry_run

    repo_names = gh_list_repos(session, owner, prefix, verbose=verbose)

    if not repo_names:
        print(f"No repos found matching prefix '{prefix}' for owner '{owner}'")
        return

    action = "Would delete" if dry_run else "Deleting"
    print(f"{action} {len(repo_names)} repo(s) matching '{prefix}' for {owner}:\n")
    for name in repo_names:
        print(f"  {name}")

    if dry_run:
        print("\nDry-run — nothing deleted. Re-run without --dry-run to delete.")
        return

    confirm = input(f"\nType '{prefix}' to confirm deletion: ")
    if confirm != prefix:
        print("Aborted.")
        return

    deleted = 0
    for name in repo_names:
        try:
            gh_delete_repo(session, owner, name)
            print(f"  ✓ Deleted {name}")
            deleted += 1
        except requests.HTTPError as e:
            print(f"  ✗ Failed to delete {name}: {e}")

    print(f"\nDeleted {deleted}/{len(repo_names)} repos.")


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="gg_seed_data.py",
        description="Seed GitHub repos with fake secrets for GitGuardian testing.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Quick start:
              export GITHUB_TOKEN=ghp_...
              python gg_seed_data.py create-repos --prefix gg-seed --count 4
              python gg_seed_data.py feed-repos   --prefix gg-seed --commits 10
              # Configure those repos in GitGuardian, then trigger a history scan
              python gg_seed_data.py clean-repos  --prefix gg-seed --dry-run
        """),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # --- create-repos ---
    p_create = sub.add_parser(
        "create-repos",
        help="Create GitHub repos with realistic names",
    )
    p_create.add_argument("--token", help="GitHub PAT (or set GITHUB_TOKEN)")
    p_create.add_argument("--owner", help="GitHub username or org (default: auto-detect)")
    p_create.add_argument("--prefix", default="gg-seed", help="Repo name prefix (default: gg-seed)")
    p_create.add_argument("--count", type=int, default=3, help="Number of repos to create (default: 3)")
    vis = p_create.add_mutually_exclusive_group()
    vis.add_argument("--private", dest="public", action="store_false", default=False,
                     help="Create private repos (default)")
    vis.add_argument("--public", dest="public", action="store_true",
                     help="Create public repos")
    p_create.set_defaults(func=cmd_create_repos)

    # --- feed-repos ---
    p_feed = sub.add_parser(
        "feed-repos",
        help="Push fake-secret commits to matching repos",
    )
    p_feed.add_argument("--token", help="GitHub PAT (or set GITHUB_TOKEN)")
    p_feed.add_argument("--owner", help="GitHub username or org (default: auto-detect)")
    p_feed.add_argument("--prefix", default="gg-seed",
                        help="Target repos whose names start with this prefix (default: gg-seed)")
    p_feed.add_argument("--repos", help="Comma-separated explicit repo names (overrides --prefix)")
    p_feed.add_argument("--commits", type=int, default=8,
                        help="Commits per repo (default: 8)")
    p_feed.add_argument("--branch", default="main", help="Branch to push to (default: main)")
    p_feed.add_argument("--seed", type=int, default=None,
                        help="RNG seed for reproducible output")
    p_feed.add_argument("--verbose", "-v", action="store_true",
                        help="Print git commands, API calls, and full tracebacks")
    p_feed.set_defaults(func=cmd_feed_repos)

    # --- clean-repos ---
    p_clean = sub.add_parser(
        "clean-repos",
        help="Delete repos matching a prefix",
    )
    p_clean.add_argument("--token", help="GitHub PAT (or set GITHUB_TOKEN)")
    p_clean.add_argument("--owner", help="GitHub username or org (default: auto-detect)")
    p_clean.add_argument("--prefix", default="gg-seed",
                         help="Delete repos whose names start with this prefix (default: gg-seed)")
    p_clean.add_argument("--dry-run", action="store_true",
                         help="List repos that would be deleted without deleting")
    p_clean.add_argument("--verbose", "-v", action="store_true",
                         help="Print API calls made during repo discovery")
    p_clean.set_defaults(func=cmd_clean_repos)

    # --- readme ---
    p_readme = sub.add_parser(
        "readme",
        help="Print full workflow documentation and exit",
    )
    p_readme.set_defaults(func=lambda _: print(README))

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
