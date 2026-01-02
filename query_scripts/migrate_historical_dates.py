import json
from datetime import datetime, timedelta

def estimate_dates_for_user(problems_array):
    """Estimate dates working backwards from July 22, 2025 at 7-day intervals."""
    if not problems_array:
        return []

    most_recent_date = datetime(2025, 7, 22)
    result = []

    for i in range(len(problems_array) - 1, -1, -1):
        date = most_recent_date - timedelta(days=(len(problems_array) - 1 - i) * 7)
        result.insert(0, {
            "date": date.strftime("%Y-%m-%d"),
            "count": problems_array[i]
        })

    return result

def migrate_json_file(input_path, output_path):
    with open(input_path, 'r') as f:
        data = json.load(f)

    migrated_count = 0
    for user in data:
        problems_each_week = user.get("problems_each_week", [])

        if problems_each_week and isinstance(problems_each_week[0], int):
            user["problems_each_week"] = estimate_dates_for_user(problems_each_week)
            migrated_count += 1
            print(f"Migrated {user['name']}: {len(problems_each_week)} entries")

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=4)

    print(f"\nMigration complete! Migrated {migrated_count} users.")

if __name__ == "__main__":
    input_file = "../leetcode-elo/public/users_by_elo.json"
    output_file = "../leetcode-elo/public/users_by_elo_migrated.json"

    # Backup original
    import shutil
    shutil.copy(input_file, "../leetcode-elo/public/users_by_elo.backup.json")
    print("Backup created: users_by_elo.backup.json")

    migrate_json_file(input_file, output_file)
    print(f"\nReview {output_file} before replacing original!")
