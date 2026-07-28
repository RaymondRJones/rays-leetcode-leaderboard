#!/usr/bin/env python3
"""Incrementally enrich the consolidated problem catalog with LeetCode topics."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, Callable

import requests

try:
    from .cookies import cookies
except ImportError:
    from cookies import cookies


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "leetcode-elo" / "public" / "problems_with_categories.json"
DEFAULT_CHECKPOINT_EVERY = 25
DEFAULT_DELAY_SECONDS = 0.2

HEADERS = {
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Content-Type": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) "
        "Gecko/20100101 Firefox/123.0"
    ),
}

QUESTION_QUERY = """
query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
        topicTags {
            name
        }
    }
}
"""

TopicFetcher = Callable[[str], list[str] | None]


class CategoryError(ValueError):
    """Raised when a category catalog cannot be safely processed."""


def load_catalog(path: Path) -> list[dict[str, Any]]:
    try:
        catalog = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise CategoryError(f"Catalog not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise CategoryError(f"Invalid JSON in {path}: {exc}") from exc

    if not isinstance(catalog, list):
        raise CategoryError(f"Expected a JSON array in {path}")

    seen_slugs: set[str] = set()
    for index, problem in enumerate(catalog):
        if not isinstance(problem, dict):
            raise CategoryError(f"Catalog entry {index} is not an object")
        slug = problem.get("TitleSlug")
        if not isinstance(slug, str) or not slug.strip():
            raise CategoryError(f"Catalog entry {index} has an invalid TitleSlug")
        if slug in seen_slugs:
            raise CategoryError(f"Duplicate TitleSlug in catalog: {slug}")
        seen_slugs.add(slug)

        topics = problem.get("Topics")
        if topics is None:
            problem["Topics"] = []
        elif not isinstance(topics, list):
            raise CategoryError(f"Problem {slug} has a non-array Topics field")

    return catalog


def write_catalog(path: Path, catalog: list[dict[str, Any]]) -> None:
    """Atomically replace the catalog after a successful JSON write."""
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    temporary_path.write_text(
        json.dumps(catalog, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(path)


def get_problem_topics(
    title_slug: str,
    *,
    session: Any = requests,
    timeout: float = 20,
) -> list[str] | None:
    """Return topic names, or None when LeetCode cannot provide a safe result."""
    payload = {
        "operationName": "questionData",
        "query": QUESTION_QUERY,
        "variables": {"titleSlug": title_slug},
    }

    try:
        response = session.post(
            "https://leetcode.com/graphql",
            headers=HEADERS,
            cookies=cookies,
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError) as exc:
        print(f"  Request failed for {title_slug}: {exc}")
        return None

    if result.get("errors"):
        print(f"  GraphQL error for {title_slug}: {result['errors']}")
        return None

    question = result.get("data", {}).get("question")
    if not question:
        print(f"  No question data returned for {title_slug}")
        return None

    topics = question.get("topicTags")
    if not isinstance(topics, list):
        print(f"  Invalid topic data returned for {title_slug}")
        return None

    return [
        tag["name"]
        for tag in topics
        if isinstance(tag, dict)
        and isinstance(tag.get("name"), str)
        and tag["name"].strip()
    ]


def catalog_stats(catalog: list[dict[str, Any]]) -> dict[str, int]:
    with_topics = sum(bool(problem.get("Topics")) for problem in catalog)
    return {
        "total": len(catalog),
        "with_topics": with_topics,
        "without_topics": len(catalog) - with_topics,
    }


def enrich_catalog(
    catalog_path: Path,
    *,
    fetcher: TopicFetcher = get_problem_topics,
    limit: int | None = None,
    checkpoint_every: int = DEFAULT_CHECKPOINT_EVERY,
    delay_seconds: float = DEFAULT_DELAY_SECONDS,
) -> dict[str, int]:
    """Fetch only missing topics while preserving every catalog entry."""
    catalog = load_catalog(catalog_path)
    pending_indices = [
        index for index, problem in enumerate(catalog) if not problem.get("Topics")
    ]
    if limit is not None:
        pending_indices = pending_indices[:limit]

    enriched = 0
    failed = 0
    changed = False

    for position, index in enumerate(pending_indices, start=1):
        problem = catalog[index]
        slug = problem["TitleSlug"]
        title = problem.get("Title", slug)
        print(f"[{position}/{len(pending_indices)}] {title}")

        topics = fetcher(slug)
        if topics is None:
            failed += 1
        else:
            clean_topics = list(
                dict.fromkeys(
                    topic.strip()
                    for topic in topics
                    if isinstance(topic, str) and topic.strip()
                )
            )
            if clean_topics:
                problem["Topics"] = clean_topics
                enriched += 1
                changed = True
            else:
                print(f"  No topic tags returned for {slug}; leaving it pending")
                failed += 1

        if changed and position % checkpoint_every == 0:
            write_catalog(catalog_path, catalog)
            changed = False
            print(f"  Checkpoint saved after {position} attempted problems")

        if delay_seconds > 0 and position < len(pending_indices):
            time.sleep(delay_seconds)

    if changed:
        write_catalog(catalog_path, catalog)

    final_stats = catalog_stats(catalog)
    return {
        **final_stats,
        "attempted": len(pending_indices),
        "enriched": enriched,
        "failed": failed,
    }


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def nonnegative_float(value: str) -> float:
    parsed = float(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return parsed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch topics only for uncategorized problems in the shared catalog."
    )
    parser.add_argument(
        "--catalog",
        type=Path,
        default=DEFAULT_CATALOG,
        help=f"Catalog to enrich (default: {DEFAULT_CATALOG})",
    )
    parser.add_argument(
        "--limit",
        type=positive_int,
        help="Process at most this many uncategorized problems",
    )
    parser.add_argument(
        "--checkpoint-every",
        type=positive_int,
        default=DEFAULT_CHECKPOINT_EVERY,
        help=f"Save after this many attempts (default: {DEFAULT_CHECKPOINT_EVERY})",
    )
    parser.add_argument(
        "--delay",
        type=nonnegative_float,
        default=DEFAULT_DELAY_SECONDS,
        help=f"Delay between requests in seconds (default: {DEFAULT_DELAY_SECONDS})",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Report category coverage without making network requests",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.status:
            stats = catalog_stats(load_catalog(args.catalog))
            print(
                f"{stats['total']} total problems: "
                f"{stats['with_topics']} categorized, "
                f"{stats['without_topics']} awaiting enrichment."
            )
            return 0

        stats = enrich_catalog(
            args.catalog,
            limit=args.limit,
            checkpoint_every=args.checkpoint_every,
            delay_seconds=args.delay,
        )
    except CategoryError as exc:
        print(f"Category enrichment failed: {exc}")
        return 1

    print(
        f"Attempted {stats['attempted']} problems: "
        f"{stats['enriched']} enriched, {stats['failed']} failed. "
        f"Coverage is now {stats['with_topics']}/{stats['total']}."
    )
    return 1 if stats["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
