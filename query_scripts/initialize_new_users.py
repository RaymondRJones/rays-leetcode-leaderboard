import argparse

import requests

from get_leetcode_users_elo_problems_solved import (
    challenge_month,
    challenge_now,
    get_problems_solved,
)
from kv_client import get_leetcode_data, get_users_list, put_leetcode_data
from query_users_elo_daily import get_elo_of_leetcoder


def initialize_new_users(registered_users, leaderboard, problem_fetcher, elo_fetcher):
    updated_leaderboard = list(leaderboard)
    existing_usernames = {
        str(user.get("name", "")).strip().casefold()
        for user in leaderboard
        if user.get("name")
    }
    added = []
    skipped = []

    for registration in registered_users:
        username = str(registration.get("leetcode_username", "")).strip()
        normalized_username = username.casefold()

        if not username or normalized_username in existing_usernames:
            continue

        try:
            problem_count = problem_fetcher(username)
            elo = elo_fetcher(username)
        except (KeyError, TypeError, ValueError, IndexError, requests.RequestException) as error:
            skipped.append((username, str(error)))
            continue

        if problem_count is None or elo is None:
            skipped.append((username, "LeetCode profile data was unavailable"))
            continue

        problem_count = int(problem_count)
        elo = int(elo)
        display_name = str(registration.get("display_name") or username).strip()
        current_month = challenge_month(challenge_now())

        updated_leaderboard.append({
            "name": username,
            "display_name": display_name,
            "elo": elo,
            "prev_elo": elo,
            "prev_problem_count": problem_count,
            "current_problem_count": problem_count,
            "current_problem_delta": 0,
            "month_start_problem_count": problem_count,
            "month_baseline_month": current_month,
            "problems_each_week": [],
            "is_active": True,
            "profile_not_found_count": 0,
        })
        existing_usernames.add(normalized_username)
        added.append(username)

    return updated_leaderboard, added, skipped


def main():
    parser = argparse.ArgumentParser(
        description="Add only registered users missing from the LeetCode leaderboard."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and report new users without writing to KV.",
    )
    args = parser.parse_args()

    registered_users = get_users_list()
    leaderboard = get_leetcode_data()
    print(f"Registered users: {len(registered_users)}")
    print(f"Current leaderboard users: {len(leaderboard)}")

    updated_leaderboard, added, skipped = initialize_new_users(
        registered_users,
        leaderboard,
        get_problems_solved,
        get_elo_of_leetcoder,
    )

    for username in added:
        print(f"Ready to add: {username}")
    for username, reason in skipped:
        print(f"Skipped {username}: {reason}")

    if not added:
        print("No new users to add. Existing leaderboard data was not changed.")
        return

    if args.dry_run:
        print(f"Dry run complete. Would add {len(added)} user(s); KV was not changed.")
        return

    if not put_leetcode_data(updated_leaderboard):
        raise SystemExit("Failed to write the updated leaderboard to KV.")

    print(f"Added {len(added)} new user(s). Existing users were not updated.")


if __name__ == "__main__":
    main()
