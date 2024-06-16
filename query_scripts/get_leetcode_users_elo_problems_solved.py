import requests
import json
from cookies import cookies
# Define the headers and cookies as given in your template


headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0'
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
        "variables": {"username": username}
    }
    response = requests.post(url, headers=headers, cookies=cookies, json=payload)
    if response.status_code == 200:
        data = response.json()
        total_problems_solved = data['data']['matchedUser']['submitStatsGlobal']['acSubmissionNum'][0]['count']
        return total_problems_solved
    else:
        print(f'Failed to retrieve problem stats for {username}: {response.status_code}')
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
        "variables": {"username": username}
    }
    response = requests.post(url, headers=headers, cookies=cookies, json=payload)
    if response.status_code == 200:
        data = response.json()
        return data['data']['userContestRanking']['rating']
    else:
        print('Failed to retrieve data for {}: {}'.format(username, response.status_code))
        return None

def read_usernames_from_file(filename):
    with open(filename, 'r') as file:
        return [line.strip() for line in file.readlines()]

def write_elos_to_json(filename, user_elos):
    data = []
    for user, elo in user_elos:
        data.append({"name": user, "elo": elo})
    
    with open(filename, 'w') as file:
        json.dump(data, file, indent=4)

def main():
    usernames = read_usernames_from_file('usernames_fixed.txt')
    user_elos = []
    for username in usernames:
        print("Getting elo of...", username)
        elo = int(get_elo_of_leetcoder(username))
        if elo is not None:
            user_elos.append((username, elo))
            print("Success! Adding value of elo", elo, "to", username)
        problems_solved_count = get_problems_solved(username)
        print("Problems solved by user...", problems_solved_count)
    write_elos_to_json('../leetcode-elo/public/users_by_elo.json', user_elos)

if __name__ == "__main__":
    main()
