import json
import tempfile
import unittest
from pathlib import Path

from query_scripts.sync_zerotrac_catalog import CatalogError, sync_catalog


def problem(problem_id, slug, rating=1500):
    return {
        "Rating": rating,
        "ID": problem_id,
        "Title": slug.replace("-", " ").title(),
        "TitleSlug": slug,
        "ContestSlug": "weekly-contest-500",
        "ProblemIndex": "Q1",
    }


class SyncZeroTracCatalogTests(unittest.TestCase):
    def test_preserves_topics_and_adds_unenriched_problems(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.json"
            output = root / "catalog.json"
            source.write_text(
                json.dumps([problem(1, "known"), problem(2, "new")]),
                encoding="utf-8",
            )
            output.write_text(
                json.dumps([{**problem(1, "known"), "Topics": ["Array"]}]),
                encoding="utf-8",
            )

            stats = sync_catalog(source, output)
            catalog = json.loads(output.read_text(encoding="utf-8"))

            self.assertEqual(["Array"], catalog[0]["Topics"])
            self.assertEqual([], catalog[1]["Topics"])
            self.assertEqual(1, stats["added"])
            self.assertEqual(1, stats["without_topics"])

    def test_rejects_duplicate_slugs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.json"
            output = root / "catalog.json"
            source.write_text(
                json.dumps([problem(1, "duplicate"), problem(2, "duplicate")]),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(CatalogError, "Duplicate TitleSlug"):
                sync_catalog(source, output)

    def test_rejects_unexpected_catalog_shrink(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.json"
            output = root / "catalog.json"
            source.write_text(json.dumps([problem(1, "one")]), encoding="utf-8")
            output.write_text(
                json.dumps(
                    [
                        {**problem(1, "one"), "Topics": []},
                        {**problem(2, "two"), "Topics": []},
                    ]
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(CatalogError, "Refusing to shrink"):
                sync_catalog(source, output)


if __name__ == "__main__":
    unittest.main()
