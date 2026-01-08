import requests
import json
import sys
from cookies import cookies

headers = {
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
}


def get_problem_topics(title_slug):
    """
    Fetch problem topics/categories using LeetCode GraphQL API
    """
    url = "https://leetcode.com/graphql"
    payload = {
        "operationName": "questionData",
        "query": """
        query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                questionId
                questionFrontendId
                title
                titleSlug
                difficulty
                topicTags {
                    name
                    slug
                }
            }
        }
        """,
        "variables": {"titleSlug": title_slug},
    }

    try:
        response = requests.post(url, headers=headers, cookies=cookies, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("data") and data["data"].get("question"):
                question_data = data["data"]["question"]
                topics = [tag["name"] for tag in question_data.get("topicTags", [])]
                return topics
            else:
                print(f"No data found for {title_slug}")
                return []
        else:
            print(f"Failed to fetch topics for {title_slug}: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error fetching topics for {title_slug}: {e}")
        return []


def main(limit=None):
    # Load existing problem data
    input_file = "leetcode-problem-analysis/leetcode_problem_data.json"
    output_file = "leetcode-problem-analysis/leetcode_problems_with_categories.json"

    print(f"Loading problem data from {input_file}...")
    with open(input_file, "r") as f:
        problems = json.load(f)

    if limit:
        problems = problems[:limit]
        print(f"Processing first {len(problems)} problems (limited)")
    else:
        print(f"Found {len(problems)} problems")

    # Process each problem to add topics
    problems_with_categories = []
    for i, problem in enumerate(problems):
        title_slug = problem.get("TitleSlug")
        if not title_slug:
            print(f"Skipping problem {i+1}: No TitleSlug found")
            continue

        print(f"Processing {i+1}/{len(problems)}: {problem.get('Title')} ({title_slug})")

        topics = get_problem_topics(title_slug)
        problem_with_topics = problem.copy()
        problem_with_topics["Topics"] = topics
        problems_with_categories.append(problem_with_topics)

        # Save progress every 100 problems
        if (i + 1) % 100 == 0:
            print(f"Saving progress... ({i+1} problems processed)")
            with open(output_file, "w") as f:
                json.dump(problems_with_categories, f, indent=2)

    # Final save
    print(f"Saving final data to {output_file}...")
    with open(output_file, "w") as f:
        json.dump(problems_with_categories, f, indent=2)

    print(f"Done! Processed {len(problems_with_categories)} problems")

    # Print some statistics
    all_topics = set()
    for problem in problems_with_categories:
        all_topics.update(problem.get("Topics", []))

    print(f"\nFound {len(all_topics)} unique topics:")
    for topic in sorted(all_topics):
        print(f"  - {topic}")


if __name__ == "__main__":
    limit = None
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
            print(f"Limiting to {limit} problems")
        except ValueError:
            print("Usage: python fetch_problem_categories.py [limit]")
            print("Example: python fetch_problem_categories.py 50")
            sys.exit(1)
    main(limit)
