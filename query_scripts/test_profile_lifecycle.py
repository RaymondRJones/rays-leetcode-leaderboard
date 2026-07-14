import unittest
from datetime import datetime
from unittest.mock import Mock, patch

from get_leetcode_users_elo_problems_solved import (
    PROFILE_NOT_FOUND,
    PROFILE_OK,
    PROFILE_UNAVAILABLE,
    daily_update,
    ensure_monthly_baseline,
    fetch_problem_stats,
    weekly_update,
)


class ProfileLifecycleTests(unittest.TestCase):
    def run_update(self, user, result, now=None):
        writes = []
        updated = daily_update(
            [user],
            fetcher=lambda username: result,
            writer=lambda filename, users: writes.append(users),
            now=now or datetime(2026, 7, 14, 12, 0),
        )
        self.assertEqual(len(writes), 1)
        self.assertEqual(len(updated), 1)
        return updated[0]

    def test_temporary_failure_preserves_user_without_adding_a_strike(self):
        user = {
            "name": "TemporaryFailure",
            "current_problem_count": 50,
            "current_problem_delta": 4,
            "profile_not_found_count": 1,
        }

        updated = self.run_update(
            user, {"status": PROFILE_UNAVAILABLE, "count": None}
        )

        self.assertEqual(updated["current_problem_count"], 50)
        self.assertEqual(updated["current_problem_delta"], 4)
        self.assertEqual(updated["profile_not_found_count"], 1)
        self.assertNotEqual(updated.get("is_active"), False)

    def test_existing_monthly_delta_is_preserved_during_baseline_migration(self):
        user = {
            "name": "ExistingPlayer",
            "current_problem_count": 50,
            "current_problem_delta": 12,
        }

        ensure_monthly_baseline(user, datetime(2026, 7, 14, 12, 0))

        self.assertEqual(user["month_start_problem_count"], 38)
        self.assertEqual(user["month_baseline_month"], "2026-07")
        self.assertEqual(user["current_problem_delta"], 12)

    def test_three_confirmed_misses_mark_user_inactive_without_deleting_history(self):
        user = {
            "name": "DeletedProfile",
            "current_problem_count": 99,
            "problems_each_week": [{"date": "2026-07-01", "count": 90}],
        }

        for expected_failures in range(1, 4):
            user = self.run_update(
                user, {"status": PROFILE_NOT_FOUND, "count": None}
            )
            self.assertEqual(user["profile_not_found_count"], expected_failures)

        self.assertFalse(user["is_active"])
        self.assertEqual(user["current_problem_count"], 99)
        self.assertEqual(len(user["problems_each_week"]), 1)

    def test_success_reactivates_profile_and_resets_misses(self):
        user = {
            "name": "RecoveredProfile",
            "is_active": False,
            "inactive_reason": "LeetCode profile not found",
            "inactive_since": "2026-07-01T00:00:00",
            "profile_not_found_count": 3,
            "prev_problem_count": 10,
            "current_problem_count": 12,
            "current_problem_delta": 2,
        }

        updated = self.run_update(user, {"status": PROFILE_OK, "count": 15})

        self.assertTrue(updated["is_active"])
        self.assertEqual(updated["profile_not_found_count"], 0)
        self.assertNotIn("inactive_reason", updated)
        self.assertNotIn("inactive_since", updated)
        self.assertEqual(updated["current_problem_count"], 15)
        self.assertEqual(updated["month_start_problem_count"], 10)
        self.assertEqual(updated["current_problem_delta"], 5)

    def test_first_day_of_new_month_resets_baseline_once(self):
        user = {
            "name": "MonthlyPlayer",
            "current_problem_count": 50,
            "current_problem_delta": 10,
            "month_start_problem_count": 40,
            "month_baseline_month": "2026-07",
        }

        updated = self.run_update(
            user,
            {"status": PROFILE_OK, "count": 52},
            now=datetime(2026, 8, 1, 8, 0),
        )

        self.assertEqual(updated["month_start_problem_count"], 50)
        self.assertEqual(updated["month_baseline_month"], "2026-08")
        self.assertEqual(updated["current_problem_delta"], 2)

        updated = self.run_update(
            updated,
            {"status": PROFILE_OK, "count": 54},
            now=datetime(2026, 8, 1, 18, 0),
        )
        self.assertEqual(updated["month_start_problem_count"], 50)
        self.assertEqual(updated["current_problem_delta"], 4)

    def test_baseline_does_not_reset_after_first_day(self):
        user = {
            "name": "LateUpdate",
            "current_problem_count": 50,
            "month_start_problem_count": 40,
            "month_baseline_month": "2026-07",
        }

        updated = self.run_update(
            user,
            {"status": PROFILE_OK, "count": 53},
            now=datetime(2026, 8, 2, 8, 0),
        )

        self.assertEqual(updated["month_start_problem_count"], 40)
        self.assertEqual(updated["month_baseline_month"], "2026-07")
        self.assertEqual(updated["current_problem_delta"], 13)

    def test_weekly_snapshot_keeps_monthly_baseline(self):
        user = {
            "name": "WeeklyPlayer",
            "current_problem_count": 50,
            "month_start_problem_count": 40,
            "month_baseline_month": "2026-07",
            "problems_each_week": [],
        }
        writes = []

        updated = weekly_update(
            [user],
            fetcher=lambda username: {"status": PROFILE_OK, "count": 55},
            writer=lambda filename, users: writes.append(users),
            now=datetime(2026, 7, 14, 12, 0),
        )[0]

        self.assertEqual(updated["month_start_problem_count"], 40)
        self.assertEqual(updated["current_problem_delta"], 15)
        self.assertEqual(updated["prev_problem_count"], 50)

    @patch("get_leetcode_users_elo_problems_solved.requests.post")
    def test_graphql_missing_user_is_a_confirmed_miss(self, post):
        post.return_value = Mock(
            status_code=200,
            json=Mock(return_value={"data": {"matchedUser": None}}),
        )

        result = fetch_problem_stats("DeletedProfile")

        self.assertEqual(result, {"status": PROFILE_NOT_FOUND, "count": None})

    @patch("get_leetcode_users_elo_problems_solved.requests.post")
    def test_http_and_graphql_errors_are_temporary_failures(self, post):
        post.return_value = Mock(status_code=503)
        self.assertEqual(
            fetch_problem_stats("RateLimited")["status"], PROFILE_UNAVAILABLE
        )

        post.return_value = Mock(
            status_code=200,
            json=Mock(return_value={"errors": [{"message": "try later"}]}),
        )
        self.assertEqual(
            fetch_problem_stats("GraphQLError")["status"], PROFILE_UNAVAILABLE
        )


if __name__ == "__main__":
    unittest.main()
