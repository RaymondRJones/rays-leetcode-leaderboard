import unittest

from initialize_new_users import initialize_new_users


class InitializeNewUsersTests(unittest.TestCase):
    def test_adds_only_missing_users_with_zero_delta(self):
        existing = [{"name": "Existing", "current_problem_delta": 7, "custom": True}]
        registered = [
            {"leetcode_username": "existing", "display_name": "Already Here"},
            {"leetcode_username": "Douma", "display_name": "test user"},
        ]

        updated, added, skipped = initialize_new_users(
            registered,
            existing,
            lambda username: 321,
            lambda username: 1450.9,
        )

        self.assertEqual(updated[0], existing[0])
        self.assertEqual(added, ["Douma"])
        self.assertEqual(skipped, [])
        self.assertEqual(updated[1]["display_name"], "test user")
        self.assertEqual(updated[1]["elo"], 1450)
        self.assertEqual(updated[1]["prev_elo"], 1450)
        self.assertEqual(updated[1]["prev_problem_count"], 321)
        self.assertEqual(updated[1]["current_problem_count"], 321)
        self.assertEqual(updated[1]["current_problem_delta"], 0)
        self.assertEqual(updated[1]["month_start_problem_count"], 321)

    def test_skips_unavailable_profiles_without_changing_existing_users(self):
        existing = [{"name": "Existing", "current_problem_delta": 4}]
        registered = [{"leetcode_username": "Missing"}]

        updated, added, skipped = initialize_new_users(
            registered,
            existing,
            lambda username: None,
            lambda username: 0,
        )

        self.assertEqual(updated, existing)
        self.assertEqual(added, [])
        self.assertEqual(skipped, [("Missing", "LeetCode profile data was unavailable")])

    def test_ignores_duplicate_registrations_case_insensitively(self):
        registered = [
            {"leetcode_username": "Douma"},
            {"leetcode_username": "douma"},
        ]

        updated, added, skipped = initialize_new_users(
            registered,
            [],
            lambda username: 10,
            lambda username: 0,
        )

        self.assertEqual(len(updated), 1)
        self.assertEqual(added, ["Douma"])
        self.assertEqual(skipped, [])


if __name__ == "__main__":
    unittest.main()
