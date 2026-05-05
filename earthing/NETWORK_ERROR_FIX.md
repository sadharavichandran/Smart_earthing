# NetworkError Fix - EarthGuard Technician Login Issue

## Problem Summary

After logging out from the official account and attempting to log in as a technician, users encounter:

```
⚠ NetworkError when attempting to fetch resource.
```

This issue occurs even though the login works fine for the official account initially.

## Root Causes Identified & Fixed

### 1. **CORS Configuration Issues** ✅ FIXED

**Problem:** The CORS configuration in the backend was not explicit enough for handling preflight OPTIONS requests, especially when transitioning between different sessions or roles.

**Solution Implemented:**

- Added explicit OPTIONS request handler
- Expanded allowed origins to include both `localhost` and `127.0.0.1` variants
- Added explicit method and header declarations

### 2. **Request State Cleanup on Logout** ✅ FIXED

**Problem:** When a user logged out, pending async requests (like `setAlerts()`) were still in flight. When the user tried to log in with a different role, these pending requests could interfere with the new session.

**Solution Implemented:**

- Added `AbortController` support to cancel pending requests
- Created `cancelPendingRequests()` method called during logout
- Enhanced error handling to distinguish between aborted requests and actual network errors

### 3. **Network Error Handling** ✅ FIXED

**Problem:** Network errors were not providing useful diagnostic information, making it hard to distinguish between backend unavailability and CORS issues.

**Solution Implemented:**

- Enhanced error messages with context about backend URL and port
- Added better exception handling for NetworkError and fetch failures
- Improved error reporting in the UI

### 4. **Frontend Environment Configuration** ✅ FIXED

**Problem:** The frontend might not know the correct backend URL, especially during development.

**Solution Implemented:**

- Created `.env.local` with explicit `REACT_APP_API_URL=http://localhost:4000/api`
- This ensures the frontend always connects to the correct backend

## Changes Made

### Backend (`server/index.js`)

1. Enhanced CORS middleware with explicit configuration
2. Added OPTIONS preflight handler
3. Improved `/health` endpoint with diagnostic information
4. Better error handling for database connections

### Frontend (`src/App.js`)

1. Added `AbortController` for request management
2. Implemented `cancelPendingRequests()` method
3. Enhanced error messages with diagnostic info
4. Improved `handleLogout()` to clean up all pending requests
5. Added signal parameter to fetch calls

### Configuration Files

1. Created `.env.local` with explicit REACT_APP_API_URL

## How to Test the Fix

### Step 1: Start the Backend

```bash
npm run server
```

You should see:

```
✓ Database 'earthing' ready
Backend running on http://localhost:4000
```

### Step 2: Start the Frontend (in another terminal)

```bash
npm start
```

The React app should open on http://localhost:3000

### Step 3: Test the Login Flow

1. **Sign up as Official:**
   - Role: Official
   - Name: John Official
   - Email: official@company.com
   - Password: password123

2. **Log in as Official:** ✓ Should work

3. **Assign a Task:** ✓ Should work

4. **Log Out:** ✓ Should work

5. **Sign up as Technician:**
   - Role: Technician
   - Name: Tech Worker
   - Email: technician@company.com
   - Password: password123

6. **Log in as Technician:** ✓ Should now work (previously failed)

## Diagnostic Endpoints

### Health Check

```bash
curl http://localhost:4000/api/health
```

Response includes backend status, port, and allowed origins.

## If Issues Persist

### 1. Backend Not Starting

**Error:** `npm run server` fails with exit code 1

**Check:**

- Is MySQL running? (MYSQL_HOST=localhost, MYSQL_PORT=3306)
- Database credentials in `.env` (MYSQL_USER=root, MYSQL_PASSWORD=...)
- Run `npm run server` in another terminal to see full error

### 2. Frontend Can't Connect

**Error:** Console shows "Cannot reach backend"

**Check:**

- Is backend running on port 4000? (`npm run server`)
- Is `.env.local` file present? (Should have `REACT_APP_API_URL=http://localhost:4000/api`)
- Clear browser cache (Ctrl+Shift+Delete)
- Try accessing http://localhost:4000/api/health directly

### 3. CORS Errors

**Error:** Browser console shows CORS error

**Check:**

- Backend is running with updated CORS configuration
- Frontend is on port 3000 or 4001
- No custom browser policies blocking requests
- Try accessing API from a new incognito window

### 4. Timeout Errors

**Error:** Request times out

**Check:**

- Database queries are slow (check MySQL)
- Backend is running and not blocked
- Network connection is stable
- Try testing `/api/health` endpoint first

## Network Debugging Tips

### Check Backend Status

```bash
# From Windows PowerShell
$response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing
$response.Content | ConvertFrom-Json
```

### Check Network Requests (Browser)

1. Open DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Look for failed requests to `/auth/login`
5. Check Response and Headers tabs for error details

### Monitor Backend Logs

```bash
# Keep this terminal open while testing
npm run server
```

Watch for error messages in the terminal

## Summary of Improvements

| Issue                      | Before                   | After                                 |
| -------------------------- | ------------------------ | ------------------------------------- |
| Pending requests on logout | Not cleaned up           | Properly aborted with AbortController |
| CORS preflight requests    | Silent failure           | Explicit handling with OPTIONS        |
| Network error messages     | Generic "Request failed" | Detailed diagnostic information       |
| Session transition         | Could fail               | Reliable cleanup and recovery         |
| Frontend configuration     | Via env var only         | .env.local file ensures consistency   |

## Questions?

If you still encounter issues:

1. Check the browser's Network tab (F12 > Network)
2. Look at the console error messages
3. Verify both backend and frontend are running
4. Restart both services if needed:

   ```bash
   # Terminal 1
   npm run server

   # Terminal 2 (new)
   npm start
   ```

The enhanced error messages will help identify the specific issue you're facing.
