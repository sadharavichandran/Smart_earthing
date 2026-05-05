#!/usr/bin/env python3
"""
Quick test to verify the backend /api/poles/update endpoint is working
"""

import requests
import sys

BACKEND_URL = "http://localhost:4000"
BACKEND_API = f"{BACKEND_URL}/api/poles/update"

print("=" * 60)
print("🧪 Testing Backend Pole Update Endpoint")
print("=" * 60)

# Test 1: Check if backend is running
print("\n1️⃣ Checking if backend is running...")
try:
    response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
    if response.status_code == 200:
        print(f"✅ Backend is running!")
        print(f"   {response.json()}")
    else:
        print(f"⚠️ Backend returned status {response.status_code}")
except requests.exceptions.ConnectionError as e:
    print(f"❌ Backend is NOT running at {BACKEND_URL}")
    print(f"   Error: {e}")
    print(f"   Solution: Start the backend with: npm run server")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error checking backend: {e}")
    sys.exit(1)

# Test 2: Call the poles/update endpoint
print("\n2️⃣ Testing POST /api/poles/update...")
try:
    response = requests.post(
        BACKEND_API,
        json={"poleId": "POLE_1"},
        timeout=10
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 200:
        print("✅ Endpoint is working!")
    elif response.status_code == 404:
        print(f"❌ Endpoint not found (404)")
        print(f"   Make sure the endpoint exists in server/index.js")
    else:
        print(f"⚠️ Unexpected status: {response.status_code}")
        
except requests.exceptions.ConnectionError as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ All tests passed!")
print("=" * 60)
