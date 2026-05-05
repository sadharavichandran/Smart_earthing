import requests
import mysql.connector
import time
from datetime import datetime
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# ==============================
# 🔑 BLYNK CONFIG
# ==============================
BLYNK_TOKEN = "f9ZRRh-5WlcQoTh3jc-mQG6aoJc3iIb_"
SOIL_PIN = "V2"
CURRENT_PIN = "V1"

# Increase timeout and add retry logic
TIMEOUT = 15  # Increased from 5 to 15 seconds
MAX_RETRIES = 3
BACKOFF_FACTOR = 2

# Fixed API URLs
SOIL_URL = f"https://blynk.cloud/external/api/get?token={BLYNK_TOKEN}&pin={SOIL_PIN}"
CURRENT_URL = f"https://blynk.cloud/external/api/get?token={BLYNK_TOKEN}&pin={CURRENT_PIN}"

# Backend API URL
BACKEND_URL = "http://localhost:4004"
BACKEND_API = f"{BACKEND_URL}/api/poles/update"

# Create session with retry strategy
session = requests.Session()
retry_strategy = Retry(
    total=MAX_RETRIES,
    backoff_factor=BACKOFF_FACTOR,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "POST"]
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("http://", adapter)
session.mount("https://", adapter)

# ==============================
# 🗄️ DATABASE CONFIG
# ==============================
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="sarathA@123",
    database="earthing"
)

cursor = db.cursor()

# ==============================
# 🔥 INITIALIZE P101 IF NOT EXISTS
# ==============================
# We use P101 so the frontend pole data matches the app's displayed pole.
POLE_ID = "P101"
cursor.execute("SELECT id FROM poles WHERE id = %s", (POLE_ID,))
if not cursor.fetchone():
    print(f"⚠️ {POLE_ID} not found, creating it...")
    cursor.execute(
        """INSERT INTO poles (id, area, status, leakage, resistance, continuity, voltage, moisture, temp, last_check, cause) 
           VALUES (%s, 'Coimbatore Zone', 'safe', 0, 0, 'good', 0, 0, 0, 'now', 'Initial')""",
        (POLE_ID,)
    )
    db.commit()
    print(f"✅ {POLE_ID} created!")

# Get last stored values
cursor.execute("SELECT moisture, leakage FROM poles WHERE id = %s", (POLE_ID,))
row = cursor.fetchone()

if row:
    last_soil, last_current = row
else:
    last_soil, last_current = None, None

print("✅ Started fetching Blynk data...")

# ==============================
# � NOTIFY BACKEND
# ==============================
def notify_backend_pole_update(pole_id):
    """Notify backend about pole update via REST API"""
    try:
        print(f"🔌 Connecting to backend: {BACKEND_API}")
        response = session.post(
            BACKEND_API,
            json={"poleId": pole_id},
            timeout=10
        )
        if response.status_code == 200:
            print(f"📢 Backend notified about {pole_id} update")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"⚠️ Backend notification failed: {response.status_code}")
            print(f"   Message: {response.text}")
            return False
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Cannot connect to backend at {BACKEND_URL}")
        print(f"   Error: {e}")
        print(f"   Make sure backend is running: npm run server")
        return False
    except requests.exceptions.Timeout as e:
        print(f"⏱️ Backend request timeout: {e}")
        return False
    except Exception as e:
        print(f"⚠️ Could not notify backend: {e}")
        return False

# ==============================
# �🔁 LOOP - FETCH & STORE
# ==============================
while True:
    try:
        # 📡 Fetch from Blynk
        print(f"\n🔄 Fetching from Blynk (timeout={TIMEOUT}s)...")
        soil_response = session.get(SOIL_URL, timeout=TIMEOUT)
        current_response = session.get(CURRENT_URL, timeout=TIMEOUT)

        print(f"📨 Soil response: {soil_response.text.strip()}")
        print(f"📨 Current response: {current_response.text.strip()}")

        # Check if responses are valid
        if soil_response.status_code != 200 or current_response.status_code != 200:
            print(f"❌ Blynk API Error - Status: {soil_response.status_code}, {current_response.status_code}")
            time.sleep(5)
            continue

        soil = float(soil_response.text.strip())
        current = float(current_response.text.strip())

        print(f"✅ Parsed - Soil: {soil}, Current: {current}")

        # 🔥 STORE ONLY IF VALUE CHANGED
        if soil != last_soil or current != last_current:
            # Update P101 with Blynk real-time data so the displayed pole matches Blynk values.
            cursor.execute(
                """UPDATE poles SET moisture = %s, leakage = %s, updated_at = NOW() 
                   WHERE id = %s""",
                (soil, current, POLE_ID)
            )
            db.commit()
            print(f"✅ Data stored to {POLE_ID}: Soil={soil}, Leakage={current}")

            # 📢 Notify backend to broadcast updates to all connected dashboards
            notify_backend_pole_update(POLE_ID)

            last_soil = soil
            last_current = current
        else:
            print("⏭️ No change, skipping insert")

        # ⏳ Wait before next request to avoid rate limiting
        time.sleep(1)

    except ValueError as e:
        print(f"❌ Parse Error: {e} - Blynk may not have data yet")
    except requests.exceptions.Timeout:
        print(f"⏱️ Timeout Error: Request took longer than {TIMEOUT}s. Network might be slow.")
        time.sleep(10)
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection Error: Cannot reach blynk.cloud - {e}")
        time.sleep(10)
    except requests.exceptions.RequestException as e:
        print(f"❌ Network Error: {e}")
        time.sleep(5)
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()

    # ⏱️ Check every 1 second
    time.sleep(1)