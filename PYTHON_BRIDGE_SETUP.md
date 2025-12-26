# Python Bridge Setup for GAM Crawlers

## Overview

The GAM crawlers now use a Python bridge to access Google Ad Manager API. This is more reliable than the SOAP API and uses the official `googleads` Python library.

## Prerequisites

1. **Python 3.7+** installed on your system
2. **pip** (Python package manager)

## Installation Steps

### 1. Install Python Dependencies

Open a terminal/command prompt and run:

```bash
pip install googleads
```

Or if you have both Python 2 and 3:

```bash
pip3 install googleads
```

**Note**: The package name is just `googleads` (not `googleads-common` or `googleads-dfa`). The `googleads` package includes everything needed.

### 2. Verify Installation

Test if the library is installed:

```bash
python -c "import googleads; print('googleads installed successfully')"
```

### 3. Configuration

The Python bridge will automatically:
- ✅ Find your service account JSON file (`gam-360-471105-0608e8979b03.json`)
- ✅ Create a `config/googleads.yaml` file
- ✅ Use your `GAM_NETWORK_CODE` from `.env`

### 4. Manual Configuration (if needed)

If automatic configuration doesn't work, create `config/googleads.yaml`:

```yaml
ad_manager:
  application_name: GAM-Backend
  network_code: 23308471723
  path_to_private_key_file: ../gam-360-471105-0608e8979b03.json
```

**Note**: Use relative path from the config file location, or absolute path.

## How It Works

1. **Node.js** calls the Python bridge
2. **Python script** uses `googleads` library to:
   - Authenticate with service account
   - Create and run GAM reports
   - Download CSV data
   - Parse and return JSON
3. **Node.js** receives the data and stores it in MongoDB

## Troubleshooting

### Error: "Python not found"

**Solution**: Make sure Python is installed and in your PATH
```bash
python --version
# or
python3 --version
```

### Error: "googleads library not installed"

**Solution**: Install the library
```bash
pip install googleads-common googleads-dfa googleads
```

### Error: "Config file not found"

**Solution**: The bridge will auto-create the config file. If it fails:
1. Create `config/` directory in project root
2. Create `config/googleads.yaml` with the content above
3. Make sure the service account JSON path is correct

### Error: "Service account authentication failed"

**Solution**: 
1. Verify the service account JSON file exists
2. Check that the service account has access to your GAM network
3. Verify `GAM_NETWORK_CODE` is correct in `.env`

## Testing

Run the test script to verify everything works:

```bash
npm run test-crawlers
```

You should see:
- ✅ Python bridge initialized
- ✅ Config file created
- ✅ Service account found
- ✅ Crawlers can fetch data

## Benefits of Python Bridge

- ✅ **More Reliable**: Uses official Google library
- ✅ **Better Error Handling**: Clear error messages
- ✅ **Automatic Retry**: Built into googleads library
- ✅ **CSV Parsing**: Handles gzipped files automatically
- ✅ **No SOAP Issues**: Avoids 500 errors from deprecated SOAP API

## Fallback

If Python bridge is not available, the system will automatically fall back to the regular Node.js client (though it may have SOAP API issues).

## Next Steps

1. ✅ Install Python dependencies
2. ✅ Verify installation
3. 🧪 Test crawlers: `npm run test-crawlers`
4. 🚀 Start server: `npm start`

The crawlers will automatically use the Python bridge when available!

