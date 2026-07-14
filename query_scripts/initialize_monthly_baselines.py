import argparse

from get_leetcode_users_elo_problems_solved import (
    challenge_month,
    challenge_now,
    ensure_monthly_baseline,
)
from kv_client import get_leetcode_data, put_leetcode_data


def initialize_monthly_baselines(users, now):
    changed = []
    for user in users:
        had_baseline = "month_start_problem_count" in user
        had_month = bool(user.get("month_baseline_month"))
        ensure_monthly_baseline(user, now)
        if not had_baseline or not had_month:
            changed.append(user.get("name", "<unknown>"))
    return users, changed


def main():
    parser = argparse.ArgumentParser(
        description="Add missing monthly baselines without changing current scores."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report changes without writing to KV.",
    )
    args = parser.parse_args()

    now = challenge_now()
    users = get_leetcode_data()
    original_deltas = {
        user.get("name"): user.get("current_problem_delta", 0) for user in users
    }
    users, changed = initialize_monthly_baselines(users, now)

    print(f"Challenge month: {challenge_month(now)}")
    print(f"Leaderboard users: {len(users)}")
    print(f"Missing baselines initialized: {len(changed)}")

    if any(
        user.get("current_problem_delta", 0) != original_deltas.get(user.get("name"))
        for user in users
    ):
        raise SystemExit("Monthly delta verification failed; KV was not changed.")

    if not changed:
        print("No baseline changes were needed.")
        return

    if args.dry_run:
        print("Dry run complete. KV was not changed.")
        return

    if not put_leetcode_data(users):
        raise SystemExit("Failed to save monthly baselines to KV.")

    print("Monthly baselines saved. Existing monthly deltas were preserved.")


if __name__ == "__main__":
    main()
