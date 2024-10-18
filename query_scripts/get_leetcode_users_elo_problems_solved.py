import requests
import sys
import json
from cookies import cookies

# Define the headers and cookies as given in your template


headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
}


def get_problems_solved(username):
    url = "https://leetcode.com/graphql"
    payload = {
        "operationName": "userProblemsSolved",
        "query": """
        query userProblemsSolved($username: String!) {
            allQuestionsCount {
                difficulty
                count
            }
            matchedUser(username: $username) {
                problemsSolvedBeatsStats {
                    difficulty
                    percentage
                }
                submitStatsGlobal {
                    acSubmissionNum {
                        difficulty
                        count
                    }
                }
            }
        }
        """,
        "variables": {"username": username},
    }
    response = requests.post(url, headers=headers, cookies=cookies, json=payload)
    if response.status_code == 200:
        data = response.json()
        total_problems_solved = data["data"]["matchedUser"]["submitStatsGlobal"][
            "acSubmissionNum"
        ][0]["count"]
        return total_problems_solved
    else:
        print(
            f"Failed to retrieve problem stats for {username}: {response.status_code}"
        )
        return None


def get_elo_of_leetcoder(username):
    url = "https://leetcode.com/graphql"
    payload = {
        "operationName": "userContestRankingInfo",
        "query": """
        query userContestRankingInfo($username: String!) {
            userContestRanking(username: $username) {
                rating
            }
        }
        """,
        "variables": {"username": username},
    }
    response = requests.post(url, headers=headers, cookies=cookies, json=payload)
    if response.status_code == 200:
        data = response.json()
        return data["data"]["userContestRanking"]["rating"]
    else:
        print(
            "Failed to retrieve data for {}: {}".format(username, response.status_code)
        )
        return None


def load_existing_elos(filename):
    with open(filename, "r") as file:
        return json.load(file)


def update_json(filename, users):
    data = []
    for user in users:
        data.append(
            {
                "name": user["name"],
                "elo": user["elo"],
                "prev_elo": user.get("prev_elo", 0),
                "prev_problem_count": user["prev_problem_count"],
                "current_problem_delta": user["current_problem_delta"],
                "problems_each_week": user.get("problems_each_week", []),
                "current_problem_count": user["current_problem_count"],
            }
        )
    with open(filename, "w") as file:
        json.dump(data, file, indent=4)


def read_usernames_from_file(filename):
    with open(filename, "r") as file:
        return [line.strip() for line in file.readlines()]


def write_elos_to_json(filename, user_elos):
    data = []
    for user, elo, prev_elo in user_elos:
        data.append({"name": user, "elo": elo, "prev_elo": prev_elo})

    with open(filename, "w") as file:
        json.dump(data, file, indent=4)


def daily_update(existing_users):
    for user in existing_users:
        username = user["name"]
        print("Getting problem count of...", username)
        problems_solved_count = get_problems_solved(username)
        if problems_solved_count:
            print("COUNT WAS", problems_solved_count)
            old_problems_count = user.get("prev_problem_count")
            user["current_problem_count"] = problems_solved_count
            if old_problems_count == 0:
                user["current_problem_delta"] = 0
            else:
                user["current_problem_delta"] = problems_solved_count - user.get(
                    "prev_problem_count", problems_solved_count
                )
            print("Problems solved by user...", problems_solved_count)
    update_json("../leetcode-elo/public/users_by_elo.json", existing_users)
    pass


def weekly_update(existing_users):
    for user in existing_users:
        username = user["name"]
        print("Getting problem count of...", username)
        problems_solved_count = get_problems_solved(username)
        if problems_solved_count:
            print("COUNT WAS", problems_solved_count)
            if user.get("problems_each_week", []):
                user["problems_each_week"].append(user.get("current_problem_count", 0))
            else:
                user["problems_each_week"] = [user.get("current_problem_count", 0)]

            user["prev_problem_count"] = user.get(
                "current_problem_count", problems_solved_count
            )
            user["current_problem_count"] = problems_solved_count
            user["current_problem_delta"] = problems_solved_count - user.get(
                "prev_problem_count", problems_solved_count
            )
            print("Problems solved by user...", problems_solved_count)
    update_json("../leetcode-elo/public/users_by_elo.json", existing_users)


def main(weekly_or_daily):
    existing_users = load_existing_elos("../leetcode-elo/public/users_by_elo.json")
    if weekly_or_daily == "weekly":
        weekly_update(existing_users)
    elif weekly_or_daily == "daily":
        daily_update(existing_users)
    print("finished..")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <weekly or daily>")
    else:
        choice = sys.argv[1]
        main(choice)
