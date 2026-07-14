import argparse

from kv_client import (
    get_leetcode_data,
    get_users_list,
    put_leetcode_data,
    put_users_list,
)


def remove_user_records(users, leaderboard, username):
    return remove_users_records(users, leaderboard, [username])


def remove_users_records(users, leaderboard, usernames):
    normalized_usernames = {
        username.strip().casefold() for username in usernames if username.strip()
    }
    remaining_users = [
        user
        for user in users
        if str(user.get("leetcode_username", "")).strip().casefold()
        not in normalized_usernames
    ]
    remaining_leaderboard = [
        user
        for user in leaderboard
        if str(user.get("name", "")).strip().casefold() not in normalized_usernames
    ]
    return remaining_users, remaining_leaderboard


def main():
    parser = argparse.ArgumentParser(
        description="Permanently remove a user from registration and leaderboard KV data."
    )
    parser.add_argument("usernames", nargs="+", help="LeetCode username(s) to remove")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Perform the removal. Without this flag, the command is a dry run.",
    )
    args = parser.parse_args()

    users = get_users_list()
    leaderboard = get_leetcode_data()
    remaining_users, remaining_leaderboard = remove_users_records(
        users, leaderboard, args.usernames
    )
    registration_matches = len(users) - len(remaining_users)
    leaderboard_matches = len(leaderboard) - len(remaining_leaderboard)

    print(f"Registration records matched: {registration_matches}")
    print(f"Leaderboard records matched: {leaderboard_matches}")

    if not registration_matches and not leaderboard_matches:
        print("No matching user was found. KV was not changed.")
        return

    if not args.yes:
        print("Dry run only. Re-run with --yes to permanently remove these records.")
        return

    leaderboard_changed = bool(leaderboard_matches)
    if leaderboard_changed and not put_leetcode_data(remaining_leaderboard):
        raise SystemExit("Failed to update leaderboard data; no registration was removed.")

    if registration_matches and not put_users_list(remaining_users):
        if leaderboard_changed and not put_leetcode_data(leaderboard):
            raise SystemExit(
                "Registration removal failed and leaderboard rollback also failed."
            )
        raise SystemExit("Registration removal failed; leaderboard data was restored.")

    print(f"Permanently removed: {', '.join(args.usernames)}.")


if __name__ == "__main__":
    main()
