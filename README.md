# Welcome to Twitch Stats 2024

I made this to just show some of the twitch streamers and community members stats. It's just a basic JSON that displays all their ratings with their LC profiles.

# To Make Improvements

The project is pure react React

Node version is `v20.5.1`

### To run:

git clone the repo

cd into `leetcode-elo` like

```
cd leetcode-elo
```

Make sure you ran `npm install` beforehand

```
  npm start
```

You should see the homepage which loads the leaderboard.

### Main Files

99% of logic is `src/components/leaderboard.js`

This displays the leaderboard and imports data from a json that contains all user profiles and elo, hardcoded values.

The JSON file is located in `public/leaderboard.json`

# To Add New Users via a Google Form

```
- create a google form
- make a question "What is your leetcode username"
- make sure the sheet that the responses are stored in is public
- get the link to the sheet
- use the link in the wget command below

cd query_scripts

wget --no-check-certificate --output-document=users.csv '[public link to google sheet for example https://docs.google.com/spreadsheets/d/11_utLlhDXp8BGzKDW954O3l93v9ahFVOXHBavsaemBQ/]export?format=csv'

python3 add_users_to_json.py
```

## Ideas for Improvement

##### People can't remove themselves from the list

solutions -> Google Form for removing people with script that updates the JSON

##### Prediction rating should be overwritten after Wednesday for official rating
Add a new key to the JSON for is_predicted_elo
