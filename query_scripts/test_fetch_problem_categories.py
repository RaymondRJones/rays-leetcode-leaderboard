import json
import tempfile
import unittest
from pathlib import Path

from query_scripts.fetch_problem_categories import CategoryError, enrich_catalog


def problem(problem_id, slug, topics):
    return {
        "Rating": 1500,
        "ID": problem_id,
        "Title": slug.replace("-", " ").title(),
        "TitleSlug": slug,
        "ContestSlug": "weekly-contest-500",
        "ProblemIndex": "Q1",
        "Topics": topics,
    }


class FetchProblemCategoriesTests(unittest.TestCase):
    def write_catalog(self, root, problems):
        path = root / "catalog.json"
        path.write_text(json.dumps(problems), encoding="utf-8")
        return path

    def test_fetches_only_missing_topics_and_preserves_catalog(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = self.write_catalog(
                root,
                [
                    problem(1, "known", ["Array"]),
                    problem(2, "missing", []),
                ],
            )
            requested = []

            def fetcher(slug):
                requested.append(slug)
                return ["Graph", "Graph", "  Tree  "]

            stats = enrich_catalog(
                catalog_path,
                fetcher=fetcher,
                checkpoint_every=1,
                delay_seconds=0,
            )
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

            self.assertEqual(["missing"], requested)
            self.assertEqual(["Array"], catalog[0]["Topics"])
            self.assertEqual(["Graph", "Tree"], catalog[1]["Topics"])
            self.assertEqual(2, len(catalog))
            self.assertEqual(1, stats["enriched"])
            self.assertEqual(0, stats["failed"])

    def test_failed_request_leaves_problem_pending(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = self.write_catalog(
                root,
                [problem(1, "unavailable", [])],
            )

            stats = enrich_catalog(
                catalog_path,
                fetcher=lambda _slug: None,
                delay_seconds=0,
            )
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

            self.assertEqual([], catalog[0]["Topics"])
            self.assertEqual(1, stats["failed"])
            self.assertEqual(1, stats["without_topics"])

    def test_empty_topic_response_leaves_problem_pending(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = self.write_catalog(
                root,
                [problem(1, "not-tagged-yet", [])],
            )

            stats = enrich_catalog(
                catalog_path,
                fetcher=lambda _slug: [],
                delay_seconds=0,
            )
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

            self.assertEqual([], catalog[0]["Topics"])
            self.assertEqual(0, stats["enriched"])
            self.assertEqual(1, stats["failed"])

    def test_limit_bounds_network_work(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = self.write_catalog(
                root,
                [
                    problem(1, "first", []),
                    problem(2, "second", []),
                ],
            )
            requested = []

            def fetcher(slug):
                requested.append(slug)
                return ["Array"]

            stats = enrich_catalog(
                catalog_path,
                fetcher=fetcher,
                limit=1,
                delay_seconds=0,
            )

            self.assertEqual(["first"], requested)
            self.assertEqual(1, stats["attempted"])
            self.assertEqual(1, stats["without_topics"])

    def test_rejects_duplicate_slugs_before_fetching(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = self.write_catalog(
                root,
                [
                    problem(1, "duplicate", []),
                    problem(2, "duplicate", []),
                ],
            )

            with self.assertRaisesRegex(CategoryError, "Duplicate TitleSlug"):
                enrich_catalog(catalog_path, fetcher=lambda _slug: ["Array"])


if __name__ == "__main__":
    unittest.main()
