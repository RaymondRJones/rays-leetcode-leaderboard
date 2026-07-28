#!/usr/bin/env python3
"""Merge current ZeroTrac ratings with the leaderboard's topic metadata."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = REPO_ROOT.parent / "leetcode_problem_rating" / "data.json"
DEFAULT_OUTPUT = REPO_ROOT / "leetcode-elo" / "public" / "problems_with_categories.json"
REQUIRED_FIELDS = {
    "Rating",
    "ID",
    "Title",
    "TitleSlug",
    "ContestSlug",
    "ProblemIndex",
}


class CatalogError(ValueError):
    """Raised when source data would produce an unsafe catalog."""


def load_json_array(path: Path) -> list[dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise CatalogError(f"File not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise CatalogError(f"Invalid JSON in {path}: {exc}") from exc

    if not isinstance(data, list):
        raise CatalogError(f"Expected a JSON array in {path}")
    if not all(isinstance(item, dict) for item in data):
        raise CatalogError(f"Every catalog entry in {path} must be an object")
    return data


def validate_source(problems: list[dict[str, Any]]) -> None:
    if not problems:
        raise CatalogError("The ZeroTrac source catalog is empty")

    seen_slugs: set[str] = set()
    for index, problem in enumerate(problems):
        missing = REQUIRED_FIELDS.difference(problem)
        if missing:
            fields = ", ".join(sorted(missing))
            raise CatalogError(f"Problem at index {index} is missing: {fields}")

        slug = problem["TitleSlug"]
        if not isinstance(slug, str) or not slug.strip():
            raise CatalogError(f"Problem at index {index} has an invalid TitleSlug")
        if slug in seen_slugs:
            raise CatalogError(f"Duplicate TitleSlug in source: {slug}")
        seen_slugs.add(slug)

        if not isinstance(problem["Rating"], (int, float)):
            raise CatalogError(f"Problem {slug} has a non-numeric Rating")


def merge_topics(
    source: list[dict[str, Any]],
    existing: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    topics_by_slug: dict[str, list[str]] = {}
    for problem in existing:
        slug = problem.get("TitleSlug")
        topics = problem.get("Topics")
        if isinstance(slug, str) and isinstance(topics, list):
            topics_by_slug[slug] = [
                topic for topic in topics if isinstance(topic, str) and topic.strip()
            ]

    return [
        {
            **problem,
            "Topics": topics_by_slug.get(problem["TitleSlug"], []),
        }
        for problem in source
    ]


def sync_catalog(
    source_path: Path,
    output_path: Path,
    *,
    allow_shrink: bool = False,
    write: bool = True,
) -> dict[str, int]:
    source = load_json_array(source_path)
    validate_source(source)
    existing = load_json_array(output_path) if output_path.exists() else []

    if existing and len(source) < len(existing) and not allow_shrink:
        raise CatalogError(
            f"Refusing to shrink catalog from {len(existing)} to {len(source)} problems. "
            "Use --allow-shrink only after verifying the upstream change."
        )

    merged = merge_topics(source, existing)
    with_topics = sum(bool(problem["Topics"]) for problem in merged)
    stats = {
        "source": len(source),
        "previous": len(existing),
        "added": len(source) - len(existing),
        "with_topics": with_topics,
        "without_topics": len(merged) - with_topics,
    }

    if write:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = output_path.with_suffix(f"{output_path.suffix}.tmp")
        temporary_path.write_text(
            json.dumps(merged, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_path.replace(output_path)

    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Merge ZeroTrac ratings into the leaderboard problem catalog."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"ZeroTrac data.json path (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Consolidated catalog path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate and report the merge without writing it",
    )
    parser.add_argument(
        "--allow-shrink",
        action="store_true",
        help="Allow a verified upstream catalog to contain fewer problems",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        stats = sync_catalog(
            args.source,
            args.output,
            allow_shrink=args.allow_shrink,
            write=not args.check,
        )
    except CatalogError as exc:
        print(f"Catalog sync failed: {exc}", file=sys.stderr)
        return 1

    action = "Validated" if args.check else "Wrote"
    print(
        f"{action} {stats['source']} problems: "
        f"{stats['added']:+d} versus the previous catalog, "
        f"{stats['with_topics']} with topics, "
        f"{stats['without_topics']} awaiting topic enrichment."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
