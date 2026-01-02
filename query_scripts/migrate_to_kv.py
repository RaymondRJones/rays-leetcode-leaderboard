import json
from kv_client import put_kv

# Migrate users
print("Creating initial users list...")
users = [
    {
        "id": "1",
        "leetcode_username": "TheRealRaymondJones",
        "github_username": "RaymondRJones",
        "display_name": "Raymond Jones",
        "created_at": "2026-01-01T00:00:00Z"
    }
]
put_kv('users:list', users)
print("✓ Users list created")

# Migrate LeetCode data
print("\nMigrating LeetCode data...")
with open('../leetcode-elo/public/users_by_elo.json', 'r') as f:
    leetcode_data = json.load(f)
put_kv('leetcode:data', leetcode_data)
print(f"✓ Migrated {len(leetcode_data)} LeetCode users")

# Migrate GitHub data
print("\nMigrating GitHub data...")
with open('../leetcode-elo/public/github_contributions.json', 'r') as f:
    github_data = json.load(f)
put_kv('github:data', github_data)
print(f"✓ Migrated {len(github_data)} GitHub users")

print("\n✅ Migration complete!")
print("\nNext steps:")
print("1. Deploy your Cloudflare Worker")
print("2. Update .env with Cloudflare credentials (if not already done)")
print("3. Test the Python scripts with: python get_leetcode_users_elo_problems_solved.py weekly")
