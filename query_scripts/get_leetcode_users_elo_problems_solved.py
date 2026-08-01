import requests
import sys
import json
from datetime import datetime
from zoneinfo import ZoneInfo
from cookies import cookies
from kv_client import get_users_list, get_leetcode_data, put_leetcode_data

PROFILE_MISSING_THRESHOLD = 3
PROFILE_OK = "ok"
PROFILE_NOT_FOUND = "not_found"
PROFILE_UNAVAILABLE = "unavailable"
CHALLENGE_TIMEZONE = ZoneInfo("America/Los_Angeles")

# Define the headers and cookies as given in your template


headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
}


def fetch_problem_stats(username):
    url = "https://leetcode.com/graphql"
    payload = {
        "operationName": "userProblemsSolved",
        "query": """
        query userProblemsSolved($username: String!) {
            allQuestionsCount {
                difficulty
                count
            }
            matchedUser(username: $username) {
                problemsSolvedBeatsStats {
                    difficulty
                    percentage
                }
                submitStatsGlobal {
                    acSubmissionNum {
                        difficulty
                        count
                    }
                }
            }
        }
        """,
        "variables": {"username": username},
    }
    try:
        response = requests.post(
            url, headers=headers, cookies=cookies, json=payload, timeout=20
        )
    except requests.RequestException as error:
        print(f"Failed to retrieve problem stats for {username}: {error}")
        return {"status": PROFILE_UNAVAILABLE, "count": None}

    if response.status_code != 200:
        print(
            f"Failed to retrieve problem stats for {username}: {response.status_code}"
        )
        return {"status": PROFILE_UNAVAILABLE, "count": None}

    try:
        data = response.json()
    except ValueError:
        print(f"LeetCode returned invalid JSON for {username}")
        return {"status": PROFILE_UNAVAILABLE, "count": None}

    if data.get("errors") or not data.get("data"):
        print(f"LeetCode returned an API error for {username}")
        return {"status": PROFILE_UNAVAILABLE, "count": None}

    matched_user = data["data"].get("matchedUser")
    if not matched_user:
        print(f"User {username} was not found")
        return {"status": PROFILE_NOT_FOUND, "count": None}

    try:
        count = matched_user["submitStatsGlobal"]["acSubmissionNum"][0]["count"]
    except (KeyError, TypeError, IndexError):
        print(f"LeetCode returned incomplete problem stats for {username}")
        return {"status": PROFILE_UNAVAILABLE, "count": None}

    return {"status": PROFILE_OK, "count": count}


def get_problems_solved(username):
    """Compatibility wrapper used by the new-user initializer."""
    result = fetch_problem_stats(username)
    return result["count"] if result["status"] == PROFILE_OK else None


def get_elo_of_leetcoder(username):
    url = "https://leetcode.com/graphql"
    payload = {
        "operationName": "userContestRankingInfo",
        "query": """
        query userContestRankingInfo($username: String!) {
            userContestRanking(username: $username) {
                rating
            }
        }
        """,
        "variables": {"username": username},
    }
    response = requests.post(url, headers=headers, cookies=cookies, json=payload)
    if response.status_code == 200:
        data = response.json()
        return data["data"]["userContestRanking"]["rating"]
    else:
        print(
            "Failed to retrieve data for {}: {}".format(username, response.status_code)
        )
        return None


def load_existing_elos(filename=None):
    """Load existing data from KV (filename param kept for compatibility)"""
    return get_leetcode_data()


def update_json(filename, users):
    """Update KV with new data (filename param kept for compatibility)"""
    put_leetcode_data(users)
    print(f"Updated {len(users)} users in KV")


def read_usernames_from_file(filename):
    with open(filename, "r") as file:
        return [line.strip() for line in file.readlines()]


def write_elos_to_json(filename, user_elos):
    data = []
    for user, elo, prev_elo in user_elos:
        data.append({"name": user, "elo": elo, "prev_elo": prev_elo})

    with open(filename, "w") as file:
        json.dump(data, file, indent=4)


def record_profile_failure(user, status, checked_at):
    user["last_profile_check"] = checked_at

    if status == PROFILE_NOT_FOUND:
        failures = int(user.get("profile_not_found_count", 0)) + 1
        user["profile_not_found_count"] = failures
        user["last_profile_error"] = "LeetCode profile not found"
        if failures >= PROFILE_MISSING_THRESHOLD:
            user["is_active"] = False
            user["inactive_reason"] = "LeetCode profile not found"
            user.setdefault("inactive_since", checked_at)
            print(f"Marked {user['name']} inactive after {failures} confirmed misses")
        else:
            print(
                f"Confirmed miss {failures}/{PROFILE_MISSING_THRESHOLD} "
                f"for {user['name']}; preserving profile"
            )
        return

    user["last_profile_error"] = "LeetCode API temporarily unavailable"
    print(f"Temporary fetch failure for {user['name']}; preserving profile")


def record_profile_success(user, checked_at):
    user["last_profile_check"] = checked_at
    user["profile_not_found_count"] = 0
    user["is_active"] = True
    user.pop("last_profile_error", None)
    user.pop("inactive_reason", None)
    user.pop("inactive_since", None)


def challenge_now():
    return datetime.now(CHALLENGE_TIMEZONE)


def challenge_month(now):
    return now.strftime("%Y-%m")


def ensure_monthly_baseline(user, now):
    current_month = challenge_month(now)
    current_count = int(user.get("current_problem_count") or 0)

    if "month_start_problem_count" not in user:
        current_delta = int(user.get("current_problem_delta") or 0)
        user["month_start_problem_count"] = max(0, current_count - current_delta)
        user["month_baseline_month"] = current_month
        return

    if not user.get("month_baseline_month"):
        user["month_baseline_month"] = current_month
        return

    if now.day == 1 and user["month_baseline_month"] != current_month:
        user["month_start_problem_count"] = current_count
        user["month_baseline_month"] = current_month


def update_monthly_problem_count(user, problems_solved_count, now):
    ensure_monthly_baseline(user, now)
    user["current_problem_count"] = problems_solved_count
    user["current_problem_delta"] = max(
        0, problems_solved_count - int(user["month_start_problem_count"])
    )


def record_problem_history(user, problems_solved_count, now):
    """Add or replace the user's snapshot for the current challenge day."""
    snapshot_date = now.strftime("%Y-%m-%d")
    history = user.get("problems_each_week")
    if not isinstance(history, list):
        history = []
        user["problems_each_week"] = history

    for snapshot in reversed(history):
        if isinstance(snapshot, dict) and snapshot.get("date") == snapshot_date:
            snapshot["count"] = problems_solved_count
            return

    history.append({"date": snapshot_date, "count": problems_solved_count})


def daily_update(
    existing_users, fetcher=fetch_problem_stats, writer=update_json, now=None
):
    updated_users = []
    now = now or challenge_now()
    checked_at = now.isoformat(timespec="seconds")
    for user in existing_users:
        username = user["name"]
        print("Getting problem count of...", username)
        result = fetcher(username)
        problems_solved_count = result.get("count")
        if result.get("status") == PROFILE_OK and problems_solved_count is not None:
            record_profile_success(user, checked_at)
            print("COUNT WAS", problems_solved_count)
            update_monthly_problem_count(user, problems_solved_count, now)
            record_problem_history(user, problems_solved_count, now)
            print("Problems solved by user...", problems_solved_count)
        else:
            record_profile_failure(user, result.get("status"), checked_at)
        updated_users.append(user)
    writer("../leetcode-elo/public/users_by_elo.json", updated_users)
    return updated_users


def weekly_update(
    existing_users, fetcher=fetch_problem_stats, writer=update_json, now=None
):
    updated_users = []
    now = now or challenge_now()
    checked_at = now.isoformat(timespec="seconds")
    for user in existing_users:
        username = user["name"]
        print("Getting problem count of...", username)
        result = fetcher(username)
        problems_solved_count = result.get("count")
        if result.get("status") == PROFILE_OK and problems_solved_count is not None:
            record_profile_success(user, checked_at)
            print("COUNT WAS", problems_solved_count)
            user["prev_problem_count"] = user.get(
                "current_problem_count", problems_solved_count
            )
            update_monthly_problem_count(user, problems_solved_count, now)
            record_problem_history(user, problems_solved_count, now)
            print("Problems solved by user...", problems_solved_count)
        else:
            record_profile_failure(user, result.get("status"), checked_at)
        updated_users.append(user)
    writer("../leetcode-elo/public/users_by_elo.json", updated_users)
    return updated_users


def main(weekly_or_daily):
    # Get registered users from KV
    registered_users = get_users_list()
    print(f"Found {len(registered_users)} registered users")

    # Load existing LeetCode data from KV
    existing_data = load_existing_elos()

    # Create mapping of username to data
    data_map = {user['name']: user for user in existing_data}

    # Initialize new users who don't have data yet
    for reg_user in registered_users:
        username = reg_user['leetcode_username']
        if username not in data_map:
            print(f"Initializing new user: {username}")
            data_map[username] = {
                'name': username,
                'display_name': reg_user.get('display_name', username),
                'elo': 0,
                'prev_elo': 0,
                'prev_problem_count': 0,
                'current_problem_delta': 0,
                'problems_each_week': [],
                'current_problem_count': 0,
                'month_start_problem_count': 0,
                'month_baseline_month': challenge_month(challenge_now()),
                'is_active': True,
                'profile_not_found_count': 0
            }

    # Convert map back to list
    existing_users = list(data_map.values())

    if weekly_or_daily == "weekly":
        weekly_update(existing_users)
    elif weekly_or_daily == "daily":
        daily_update(existing_users)
    else:
        print("Usage: python script.py <weekly|daily>")

    print("finished..")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <weekly or daily>")
    else:
        choice = sys.argv[1]
        main(choice)
