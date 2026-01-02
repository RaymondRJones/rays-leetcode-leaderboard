import requests
import json
from datetime import datetime
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
GITHUB_TOKEN = os.getenv('GITHUB-PAT')
GITHUB_API_URL = "https://api.github.com/graphql"

def get_github_contributions(username):
    """Fetch GitHub contributions using GraphQL API"""
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }

    query = """
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
    """

    payload = {
        "query": query,
        "variables": {"username": username}
    }

    response = requests.post(GITHUB_API_URL, headers=headers, json=payload)

    if response.status_code == 200:
        data = response.json()
        if data.get("data") and data["data"].get("user"):
            contributions = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]
            return {
                "total_contributions": contributions["totalContributions"],
                "calendar_data": contributions["weeks"]
            }
        else:
            print(f"User {username} does not exist on GitHub")
            return None
    else:
        print(f"Failed to retrieve GitHub data for {username}: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def load_existing_data(filename):
    """Load existing GitHub contributions data"""
    try:
        with open(filename, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []

def update_json(filename, users):
    """Update the JSON file with new contribution data"""
    with open(filename, "w") as file:
        json.dump(users, file, indent=4)

def weekly_update(existing_users):
    """Weekly update with historical tracking"""
    valid_users = []
    for user in existing_users:
        username = user["github_username"]
        print(f"Getting GitHub contributions for {username}...")

        contributions = get_github_contributions(username)
        if contributions is not None:
            # Update historical data
            if user.get("contributions_each_week", []):
                user["contributions_each_week"].append({
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "count": contributions["total_contributions"]
                })
            else:
                user["contributions_each_week"] = [{
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "count": contributions["total_contributions"]
                }]

            # Store full calendar data
            user["calendar_data"] = contributions["calendar_data"]
            user["prev_contributions"] = user.get("current_contributions", contributions["total_contributions"])
            user["current_contributions"] = contributions["total_contributions"]
            user["contribution_delta"] = contributions["total_contributions"] - user["prev_contributions"]
            user["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            print(f"Total contributions: {contributions['total_contributions']}")
            valid_users.append(user)

    update_json("../leetcode-elo/public/github_contributions.json", valid_users)

def daily_update(existing_users):
    """Daily update of GitHub contributions"""
    valid_users = []
    for user in existing_users:
        username = user["github_username"]
        print(f"Getting GitHub contributions for {username}...")

        contributions = get_github_contributions(username)
        if contributions is not None:
            user["current_contributions"] = contributions["total_contributions"]
            user["contribution_delta"] = contributions["total_contributions"] - user.get("prev_contributions", contributions["total_contributions"])
            user["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"Total contributions: {contributions['total_contributions']}")
            valid_users.append(user)

    update_json("../leetcode-elo/public/github_contributions.json", valid_users)

def main(update_type):
    """Main function"""
    existing_users = load_existing_data("../leetcode-elo/public/github_contributions.json")

    if update_type == "weekly":
        weekly_update(existing_users)
    elif update_type == "daily":
        daily_update(existing_users)
    else:
        print("Usage: python get_github_contributions.py <weekly|daily>")

    print("Finished updating GitHub contributions data.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python get_github_contributions.py <weekly|daily>")
    else:
        update_type = sys.argv[1]
        main(update_type)
