#!/bin/bash

# Run the weekly update (fetches ELO + problem counts, writes to Cloudflare KV)
python3 get_leetcode_users_elo_problems_solved.py weekly
