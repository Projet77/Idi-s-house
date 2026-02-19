import requests
import json
import sys

# Try localhost:8000 first, but maybe it's on another port if 8000 was busy
URLS = [
    'http://localhost:8000/api/login',
    'http://localhost:8001/api/login',
    'http://localhost:8002/api/login'
]

headers = {'Content-Type': 'application/json'}
data = {
    'email': 'idishouse@ecom.sn',
    'password': '@e-commerce.sn'
}

for url in URLS:
    try:
        print(f"Testing login at {url}...")
        response = requests.post(url, headers=headers, json=data, timeout=5)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200 and response.json().get('status') == 'success':
            print("\n✅ LOGIN SUCCESSFUL! The server is working correctly.")
            sys.exit(0)
        else:
            print(f"\n❌ SERVER RESPONDED but login failed: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection refused at {url}")
    except Exception as e:
        print(f"❌ Error at {url}: {e}")

print("\n❌ Could not connect to any server instance.")
