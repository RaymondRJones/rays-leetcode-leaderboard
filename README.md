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

## Ideas for Improvement

##### People can't add themselves into the list

solutions -> Google Form for signing people up / removing people

Twitch authentication -> Give a key/ID to each user and allow them to add and remove the user that matches their ID

##### Prediction rating should be overwritten after Wednesday for official rating
Add a new key to the JSON for is_predicted_elo
