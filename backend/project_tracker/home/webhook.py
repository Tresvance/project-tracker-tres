"""
GitHub Webhook Handler
======================
Receives push and pull_request events from GitHub and
automatically creates Timesheet + TimesheetTask entries
based on commit churn (lines added + deleted).

Setup:
  1. Add GITHUB_WEBHOOK_SECRET and GITHUB_TOKEN to settings.py
  2. Add path("api/github-webhook/", github_webhook) to urls.py
  3. In GitHub repo → Settings → Webhooks → Add webhook:
       Payload URL : https://yourdomain.com/api/github-webhook/
       Content type: application/json
       Secret      : same as GITHUB_WEBHOOK_SECRET
       Events      : ✓ Pushes   ✓ Pull requests
"""

import hashlib
import hmac
import json
import logging

import requests as http_requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Project, Timesheet, TimesheetTask

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _verify_signature(request) -> bool:
    """Verify the X-Hub-Signature-256 header from GitHub."""
    secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", "")
    if not secret:
        logger.warning("GITHUB_WEBHOOK_SECRET not set — skipping signature check")
        return True  # allow in dev; set secret in production!

    sig_header = request.headers.get("X-Hub-Signature-256", "")
    expected   = "sha256=" + hmac.new(
        secret.encode(), request.body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sig_header, expected)


def _get_commit_stats(repo_full_name: str, sha: str) -> dict:
    """
    Call GitHub API to get additions + deletions for one commit.
    Returns {"additions": int, "deletions": int, "churn": int}
    """
    token   = getattr(settings, "GITHUB_TOKEN", None)
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = f"https://api.github.com/repos/{repo_full_name}/commits/{sha}"
    try:
        resp = http_requests.get(url, headers=headers, timeout=8)
        resp.raise_for_status()
        data      = resp.json()
        stats     = data.get("stats", {})
        additions = stats.get("additions", 0)
        deletions = stats.get("deletions", 0)
        return {"additions": additions, "deletions": deletions, "churn": additions + deletions}
    except Exception as exc:
        logger.error("GitHub API error for %s@%s: %s", repo_full_name, sha, exc)
        return {"additions": 0, "deletions": 0, "churn": 0}


def _get_project(repo_full_name: str):
    """Return the Project linked to this GitHub repo, or None."""
    try:
        return Project.objects.get(github_repo=repo_full_name)
    except Project.DoesNotExist:
        logger.info("No project linked to repo: %s", repo_full_name)
        return None


def _create_timesheet_entry(
    *,
    project,
    employee_name: str,
    date: str,
    hours: float,
    description: str,
    source: str,
    github_sha: str = "",
    github_pr_number: int = None,
):
    """Create one Timesheet + one TimesheetTask."""
    rate   = float(project.hourly_rate)
    amount = round(hours * rate, 2)

    ts = Timesheet.objects.create(
        project          = project,
        employee_name    = employee_name,
        date             = date,
        hourly_rate      = rate,
        total_hours      = hours,
        total_amount     = amount,
        source           = source,
        github_sha       = github_sha,
        github_pr_number = github_pr_number,
        hours_overridden = False,
    )
    TimesheetTask.objects.create(
        timesheet   = ts,
        description = description,
        hours       = hours,
        amount      = amount,
    )
    logger.info(
        "Timesheet created: project=%s employee=%s date=%s hours=%s source=%s",
        project.name, employee_name, date, hours, source,
    )
    return ts


# ─────────────────────────────────────────────────────────────
# Event handlers
# ─────────────────────────────────────────────────────────────

def _handle_push(payload: dict):
    """
    Handle a GitHub push event.
    One Timesheet entry is created per commit.
    Hours are calculated from the commit's churn (lines added + deleted).
    """
    repo_name = payload["repository"]["full_name"]
    project   = _get_project(repo_name)
    if not project:
        return

    commits = payload.get("commits", [])
    if not commits:
        return

    created = 0
    for commit in commits:
        sha    = commit["id"]
        author = commit["author"].get("name") or commit["author"].get("login", "Unknown")
        # First line of commit message, max 200 chars
        message = commit.get("message", "").split("\n")[0][:200]
        date    = commit["timestamp"][:10]  # YYYY-MM-DD

        # Skip merge commits (they duplicate PR merge entries)
        if message.lower().startswith("merge pull request") or message.lower().startswith("merge branch"):
            logger.info("Skipping merge commit: %s", sha[:7])
            continue

        stats = _get_commit_stats(repo_name, sha)
        churn = stats["churn"]
        hours = project.churn_to_hours(churn)

        description = (
            f"[commit {sha[:7]}] {message} "
            f"(+{stats['additions']} -{stats['deletions']} lines)"
        )

        _create_timesheet_entry(
            project      = project,
            employee_name= author,
            date         = date,
            hours        = hours,
            description  = description,
            source       = "GITHUB_COMMIT",
            github_sha   = sha,
        )
        created += 1

    return created


def _handle_pull_request(payload: dict):
    """
    Handle a GitHub pull_request event.
    Only acts when action == "closed" and merged == True.
    Hours are calculated from PR churn (total files changed across all commits).
    """
    if payload.get("action") != "closed":
        return
    pr = payload.get("pull_request", {})
    if not pr.get("merged"):
        return

    repo_name = payload["repository"]["full_name"]
    project   = _get_project(repo_name)
    if not project:
        return

    pr_number = pr["number"]
    author    = pr["user"]["login"]
    title     = pr.get("title", "")[:200]
    date      = pr["merged_at"][:10]  # YYYY-MM-DD
    sha       = pr.get("merge_commit_sha", "")

    # Use the PR's overall stats from GitHub API
    stats = _get_commit_stats(repo_name, sha) if sha else {"additions": 0, "deletions": 0, "churn": 0}
    churn = stats["churn"]

    # Fallback: use additions/deletions from the PR payload itself
    if churn == 0:
        churn = pr.get("additions", 0) + pr.get("deletions", 0)

    hours = project.churn_to_hours(churn)

    description = (
        f"[PR #{pr_number} merged] {title} "
        f"(+{stats['additions']} -{stats['deletions']} lines)"
    )

    _create_timesheet_entry(
        project          = project,
        employee_name    = author,
        date             = date,
        hours            = hours,
        description      = description,
        source           = "GITHUB_PR",
        github_sha       = sha,
        github_pr_number = pr_number,
    )


# ─────────────────────────────────────────────────────────────
# Main webhook view
# ─────────────────────────────────────────────────────────────

@csrf_exempt
@require_POST
def github_webhook(request):
    # 1. Verify GitHub signature
    if not _verify_signature(request):
        logger.warning("GitHub webhook: invalid signature")
        return JsonResponse({"error": "Invalid signature"}, status=403)

    # 2. Parse payload
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    event = request.headers.get("X-GitHub-Event", "")

    # 3. Route to handler
    if event == "push":
        _handle_push(payload)

    elif event == "pull_request":
        _handle_pull_request(payload)

    elif event == "ping":
        # GitHub sends a ping when the webhook is first created
        logger.info("GitHub webhook ping received: %s", payload.get("zen", ""))

    else:
        logger.info("Unhandled GitHub event: %s", event)

    return JsonResponse({"status": "ok", "event": event})