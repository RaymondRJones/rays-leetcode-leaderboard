import unittest

from review_registrations import (
    find_registration,
    prepare_approval,
    prepare_rejection,
)


class ReviewRegistrationsTests(unittest.TestCase):
    def setUp(self):
        self.pending = [
            {
                "id": "registration-1",
                "leetcode_username": "Douma",
                "github_username": "",
                "display_name": "Test User",
                "status": "pending",
                "source": "self-registration",
            }
        ]

    def test_finds_registration_by_id_or_username(self):
        self.assertEqual(find_registration(self.pending, "registration-1")[0], 0)
        self.assertEqual(find_registration(self.pending, "douma")[0], 0)

    def test_approval_moves_registration_to_users(self):
        remaining, users, approved = prepare_approval(
            self.pending, [], [], "Douma", "2026-07-14T12:00:00-07:00"
        )

        self.assertEqual(remaining, [])
        self.assertEqual(len(users), 1)
        self.assertEqual(approved["source"], "approved-registration")
        self.assertNotIn("status", approved)
        self.assertEqual(approved["approved_at"], "2026-07-14T12:00:00-07:00")

    def test_approval_rejects_existing_profile(self):
        with self.assertRaisesRegex(ValueError, "already approved"):
            prepare_approval(
                self.pending,
                [{"leetcode_username": "douma"}],
                [],
                "Douma",
                "2026-07-14T12:00:00-07:00",
            )

    def test_rejection_removes_only_matching_registration(self):
        remaining, rejected = prepare_rejection(self.pending, "douma")
        self.assertEqual(remaining, [])
        self.assertEqual(rejected["id"], "registration-1")


if __name__ == "__main__":
    unittest.main()
