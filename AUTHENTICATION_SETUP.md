# GAM Authentication Setup

## Service Account Configuration

The GAM crawlers can authenticate using a service account JSON file. The system will automatically look for the service account file in the following locations:

1. **Environment Variable** (Priority 1):
   - Set `GAM_SERVICE_ACCOUNT_KEY_PATH` in your `.env` file
   - Example: `GAM_SERVICE_ACCOUNT_KEY_PATH=./gam-360-471105-0608e8979b03.json`

2. **Auto-Detection** (Priority 2):
   - The system will automatically search for these filenames in the project root:
     - `gam-360-471105-0608e8979b03.json` ✅ (Your current file)
     - `service-account-key.json`
     - `gam-service-account.json`
     - `google-service-account.json`

3. **GAM Data Folder** (Priority 3):
   - Checks `../GAM Data/gam-360-471105-0608e8979b03.json`

## Current Configuration

✅ **Service Account File**: `gam-360-471105-0608e8979b03.json` (found in project root)
✅ **Network Code**: `23308471723` (set in .env)

## Required Environment Variables

Make sure your `.env` file has:

```env
# Google Ad Manager Network Code
GAM_NETWORK_CODE=23308471723

# Optional: Service Account Key Path (auto-detected if not set)
GAM_SERVICE_ACCOUNT_KEY_PATH=./gam-360-471105-0608e8979b03.json
```

## How It Works

1. **Service Account Authentication** (Preferred):
   - Uses the JSON key file for authentication
   - No user interaction required
   - Works automatically once configured

2. **OAuth Token Authentication** (Fallback):
   - Uses tokens stored in the `adManager` collection
   - Requires OAuth flow via `/authorize/:token` endpoint
   - Used if service account is not available

## Verification

Run the test script to verify authentication:

```bash
npm run test-crawlers
```

You should see:
- ✅ Service account file found
- ✅ GAM_NETWORK_CODE configured
- ✅ Authentication initialized

## Troubleshooting

### Error: "No valid authentication available"

**Solution 1**: Make sure the service account file exists in the project root:
```bash
ls gam-360-471105-0608e8979b03.json
```

**Solution 2**: Add the path to `.env`:
```env
GAM_SERVICE_ACCOUNT_KEY_PATH=./gam-360-471105-0608e8979b03.json
```

**Solution 3**: Verify the service account has access to your GAM network:
- Go to Google Cloud Console
- Check IAM permissions for the service account
- Ensure it has access to Google Ad Manager API

### Error: "Invalid GAM_NETWORK_CODE"

Make sure `GAM_NETWORK_CODE` is set in your `.env` file:
```env
GAM_NETWORK_CODE=23308471723
```

## Service Account Permissions

The service account needs these permissions:
- ✅ Google Ad Manager API access
- ✅ Network access (network code: 23308471723)
- ✅ Report generation permissions

## Next Steps

1. ✅ Service account file is in place
2. ✅ Network code is configured
3. 🧪 Test the crawlers: `npm run test-crawlers`
4. 🚀 Start the server: `npm start`

The crawlers will automatically use the service account for authentication!

