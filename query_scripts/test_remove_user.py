import unittest

from remove_user import remove_user_records, remove_users_records


class RemoveUserTests(unittest.TestCase):
    def test_removes_registration_and_leaderboard_case_insensitively(self):
        users = [
            {"leetcode_username": "KeepMe"},
            {"leetcode_username": "Douma"},
        ]
        leaderboard = [{"name": "keepme"}, {"name": "DOUMA"}]

        remaining_users, remaining_leaderboard = remove_user_records(
            users, leaderboard, "douma"
        )

        self.assertEqual(remaining_users, [{"leetcode_username": "KeepMe"}])
        self.assertEqual(remaining_leaderboard, [{"name": "keepme"}])

    def test_unknown_username_changes_nothing(self):
        users = [{"leetcode_username": "KeepMe"}]
        leaderboard = [{"name": "KeepMe"}]

        remaining_users, remaining_leaderboard = remove_user_records(
            users, leaderboard, "Unknown"
        )

        self.assertEqual(remaining_users, users)
        self.assertEqual(remaining_leaderboard, leaderboard)

    def test_removes_multiple_users_in_one_operation(self):
        users = [
            {"leetcode_username": "KeepMe"},
            {"leetcode_username": "Douma"},
            {"leetcode_username": "eunice"},
        ]
        leaderboard = [
            {"name": "KeepMe"},
            {"name": "Douma"},
            {"name": "eunice"},
        ]

        remaining_users, remaining_leaderboard = remove_users_records(
            users, leaderboard, ["douma", "EUNICE"]
        )

        self.assertEqual(remaining_users, [{"leetcode_username": "KeepMe"}])
        self.assertEqual(remaining_leaderboard, [{"name": "KeepMe"}])


if __name__ == "__main__":
    unittest.main()
