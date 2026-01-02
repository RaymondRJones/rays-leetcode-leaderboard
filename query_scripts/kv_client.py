import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

# Use the Worker URL as the bridge to KV
WORKER_URL = os.getenv('WORKER_URL', 'https://weathered-dream-8f83.rayjones2170.workers.dev')

def get_kv(key):
    """Get value from KV store via Worker"""
    url = f"{WORKER_URL}?key={key}"

    try:
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()
            # Worker returns {value: "..."}, parse if it's a JSON string
            if data.get('value') is None or data.get('value') == 'null':
                return None

            # Try to parse as JSON if it's a string
            try:
                return json.loads(data['value'])
            except (json.JSONDecodeError, TypeError):
                return data['value']
        else:
            print(f"Error getting KV {key}: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"Exception getting KV {key}: {e}")
        return None

def put_kv(key, value):
    """Put value to KV store via Worker"""
    try:
        # Convert value to JSON string if it's a dict or list
        if isinstance(value, (dict, list)):
            value_str = json.dumps(value)
        else:
            value_str = str(value)

        payload = {
            'key': key,
            'value': value_str
        }

        response = requests.post(WORKER_URL, json=payload)

        if response.status_code == 200:
            return True
        else:
            print(f"Error putting KV {key}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Exception putting KV {key}: {e}")
        return False

def get_users_list():
    """Get registered users from KV"""
    users = get_kv('users:list')
    return users if users else []

def get_leetcode_data():
    """Get LeetCode data from KV"""
    data = get_kv('leetcode:data')
    return data if data else []

def put_leetcode_data(data):
    """Save LeetCode data to KV"""
    return put_kv('leetcode:data', data)

def get_github_data():
    """Get GitHub data from KV"""
    data = get_kv('github:data')
    return data if data else []

def put_github_data(data):
    """Save GitHub data to KV"""
    return put_kv('github:data', data)
