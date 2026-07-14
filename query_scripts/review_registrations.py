import argparse
from datetime import datetime
from zoneinfo import ZoneInfo

from get_leetcode_users_elo_problems_solved import PROFILE_OK, fetch_problem_stats
from kv_client import (
    get_leetcode_data,
    get_pending_registrations,
    get_users_list,
    put_pending_registrations,
    put_users_list,
)


def find_registration(pending, identifier):
    normalized_identifier = identifier.strip().casefold()
    for index, registration in enumerate(pending):
        if str(registration.get("id", "")).casefold() == normalized_identifier:
            return index, registration
        if (
            str(registration.get("leetcode_username", "")).strip().casefold()
            == normalized_identifier
        ):
            return index, registration
    raise ValueError(f"No pending registration matches {identifier}.")


def prepare_approval(pending, users, leaderboard, identifier, approved_at):
    index, registration = find_registration(pending, identifier)
    leetcode_username = str(registration.get("leetcode_username", "")).casefold()
    github_username = str(registration.get("github_username", "")).casefold()

    duplicate = any(
        str(user.get("leetcode_username", "")).casefold() == leetcode_username
        or (
            github_username
            and str(user.get("github_username", "")).casefold() == github_username
        )
        for user in users
    ) or any(
        str(user.get("name", "")).casefold() == leetcode_username
        for user in leaderboard
    )
    if duplicate:
        raise ValueError("This profile is already approved or ranked.")

    approved = dict(registration)
    approved.pop("status", None)
    approved["source"] = "approved-registration"
    approved["approved_at"] = approved_at

    remaining_pending = pending[:index] + pending[index + 1:]
    return remaining_pending, users + [approved], approved


def prepare_rejection(pending, identifier):
    index, registration = find_registration(pending, identifier)
    return pending[:index] + pending[index + 1:], registration


def print_pending(pending):
    if not pending:
        print("No registrations are awaiting review.")
        return

    print(f"Pending registrations: {len(pending)}")
    for registration in pending:
        username = registration.get("leetcode_username", "")
        github = registration.get("github_username") or "-"
        print(
            f"- {username} | display: {registration.get('display_name', username)} "
            f"| GitHub: {github} | submitted: {registration.get('created_at', '-')} "
            f"| id: {registration.get('id', '-')}"
        )
        print(f"  https://leetcode.com/{username}")


def verify_registration(registration):
    username = registration.get("leetcode_username", "")
    result = fetch_problem_stats(username)
    if result.get("status") != PROFILE_OK:
        raise ValueError(
            f"LeetCode profile verification failed with status: {result.get('status')}"
        )
    return result.get("count")


def approve(identifier, confirmed):
    pending = get_pending_registrations()
    users = get_users_list()
    leaderboard = get_leetcode_data()
    _, registration = find_registration(pending, identifier)
    problem_count = verify_registration(registration)
    approved_at = datetime.now(ZoneInfo("America/Los_Angeles")).isoformat(
        timespec="seconds"
    )
    remaining_pending, approved_users, approved = prepare_approval(
        pending, users, leaderboard, identifier, approved_at
    )

    print(f"LeetCode username: {approved['leetcode_username']}")
    print(f"Display name: {approved.get('display_name') or approved['leetcode_username']}")
    print(f"Current solved count: {problem_count}")
    if not confirmed:
        print("Dry run only. Re-run with --yes to approve this registration.")
        return

    if not put_users_list(approved_users):
        raise SystemExit("Approval failed while updating users:list.")

    if not put_pending_registrations(remaining_pending):
        if not put_users_list(users):
            raise SystemExit("Queue update failed and users:list rollback also failed.")
        raise SystemExit("Queue update failed; users:list was restored.")

    print(
        f"Approved {approved['leetcode_username']}. Run initialize_new_users.py "
        "to add the profile to the leaderboard."
    )


def reject(identifier, confirmed):
    pending = get_pending_registrations()
    remaining_pending, registration = prepare_rejection(pending, identifier)
    print(f"LeetCode username: {registration['leetcode_username']}")
    print(f"Display name: {registration.get('display_name') or registration['leetcode_username']}")
    if not confirmed:
        print("Dry run only. Re-run with --yes to reject this registration.")
        return

    if not put_pending_registrations(remaining_pending):
        raise SystemExit("Failed to remove the registration from the pending queue.")
    print(f"Rejected {registration['leetcode_username']}.")


def main():
    parser = argparse.ArgumentParser(
        description="List, approve, or reject pending leaderboard registrations."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("list", help="List pending registrations")

    for command in ("approve", "reject"):
        command_parser = subparsers.add_parser(command)
        command_parser.add_argument("identifier", help="Registration ID or LeetCode username")
        command_parser.add_argument(
            "--yes",
            action="store_true",
            help=f"Perform the {command}. Without this flag, the command is a dry run.",
        )

    args = parser.parse_args()
    if args.command == "list":
        print_pending(get_pending_registrations())
    elif args.command == "approve":
        approve(args.identifier, args.yes)
    else:
        reject(args.identifier, args.yes)


if __name__ == "__main__":
    main()
