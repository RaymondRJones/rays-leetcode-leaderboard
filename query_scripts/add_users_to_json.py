import json

def read_usernames_from_file(filename):
    with open(filename, 'r') as file:
        return [line.strip() for line in file.readlines()]

def load_existing_users(filename):
    with open(filename, 'r') as file:
        return json.load(file)

def update_json(filename, users):
    with open(filename, 'w') as file:
        json.dump(users, file, indent=4)

def add_users_to_json(usernames_file, json_file):
    new_usernames = read_usernames_from_file(usernames_file)
    existing_users = load_existing_users(json_file)
    for username in new_usernames:
        new_user = {
            "name": username,
            "elo": 0,
            "prev_elo": 0,
            "prev_problem_count": 0,
            "current_problem_delta": 0,
            "problems_each_week": [],
            "current_problem_count": 0
        }
        existing_users.append(new_user)
    update_json(json_file, existing_users)

if __name__ == "__main__":
    usernames_file = 'usernames_to_add.txt'
    json_file = "../leetcode-elo/public/users_by_elo.json"
    add_users_to_json(usernames_file, json_file)
    print("New users added successfully.")
