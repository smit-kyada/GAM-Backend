/**
 * Google Ad Manager Client - Python Bridge for GAM-Backend
 * Uses Python googleads library via child process for reliable SOAP API access
 * This is a fallback option when pure Node.js SOAP implementation has issues
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import logger from '../services/logger.js';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GAMClientPythonBridge {
  constructor(configPath = null) {
    this.configPath = configPath || this.findOrCreateConfigPath();
    this.config = null;
    this.lastReportData = null;
    this.loadConfig();
  }

  findOrCreateConfigPath() {
    const projectRoot = path.resolve(__dirname, '../../');
    const configPath = path.join(projectRoot, 'config', 'googleads.yaml');
    const configDir = path.dirname(configPath);

    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // If config doesn't exist, create it
    if (!fs.existsSync(configPath)) {
      const serviceAccountKeyPath = this.findServiceAccountKey();
      const networkCode = process.env.GAM_NETWORK_CODE || '23308471723';
      
      if (serviceAccountKeyPath) {
        const relativeKeyPath = path.relative(configDir, serviceAccountKeyPath).replace(/\\/g, '/');
        const configContent = `ad_manager:
        application_name: GAM-Backend
        network_code: ${networkCode}
        path_to_private_key_file: ${relativeKeyPath}`;
        
        fs.writeFileSync(configPath, configContent, 'utf8');
        logger.info(`Created googleads.yaml config at: ${configPath}`);
      }
    }

    return configPath;
  }

  findServiceAccountKey() {
    // First check environment variable
    if (process.env.GAM_SERVICE_ACCOUNT_KEY_PATH) {
      const envPath = path.resolve(process.env.GAM_SERVICE_ACCOUNT_KEY_PATH);
      if (fs.existsSync(envPath)) {
        return envPath;
      }
    }

    // Check common locations in project root
    const projectRoot = path.resolve(__dirname, '../../');
    const commonNames = [
      'gam-360-471105-0608e8979b03.json',
      'service-account-key.json',
      'gam-service-account.json',
      'google-service-account.json'
    ];

    for (const fileName of commonNames) {
      const filePath = path.join(projectRoot, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        logger.error(`Config file not found: ${this.configPath}`);
        throw new Error(`Config file not found: ${this.configPath}. Please create config/googleads.yaml`);
      }
      
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.parse(configContent);
      
      // Validate config
      if (!this.config.ad_manager) {
        throw new Error('Invalid config: missing ad_manager section');
      }
      
      if (!this.config.ad_manager.network_code) {
        throw new Error('Invalid config: missing network_code');
      }
      
      if (!this.config.ad_manager.path_to_private_key_file) {
        throw new Error('Invalid config: missing path_to_private_key_file');
      }
      
      // Check if service account file exists
      // Try resolving relative to config directory first, then project root
      const configDir = path.dirname(this.configPath);
      const projectRoot = path.resolve(__dirname, '../../');
      let keyPath = path.resolve(configDir, this.config.ad_manager.path_to_private_key_file);
      
      if (!fs.existsSync(keyPath)) {
        // Try project root
        keyPath = path.resolve(projectRoot, this.config.ad_manager.path_to_private_key_file);
      }
      
      if (!fs.existsSync(keyPath)) {
        logger.warn(`Service account key file not found at: ${keyPath}`);
        logger.warn(`Config says: ${this.config.ad_manager.path_to_private_key_file}`);
        logger.warn(`Tried: ${path.resolve(configDir, this.config.ad_manager.path_to_private_key_file)}`);
        logger.warn(`Tried: ${path.resolve(projectRoot, this.config.ad_manager.path_to_private_key_file)}`);
      } else {
        logger.info(`Service account key file found: ${keyPath}`);
        // Update config with absolute path for Python
        this.config.ad_manager.path_to_private_key_file = keyPath.replace(/\\/g, '/');
      }
      
      logger.info(`GAM Python Bridge Client initialized with network code: ${this.config.ad_manager.network_code}`);
    } catch (error) {
      logger.error(`Error loading GAM config: ${error.message}`);
      throw error;
    }
  }

  async runPythonScript(scriptContent, args = []) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../temp_python_script.py');
      const argsFile = path.join(__dirname, '../../temp_python_args.json');
      let tempFilesCreated = false;
      
      // Write temporary Python script
      try {
        fs.writeFileSync(pythonScript, scriptContent, 'utf8');
        tempFilesCreated = true;
        logger.info(`Python script written to: ${pythonScript}`);
      } catch (error) {
        reject(new Error(`Failed to write Python script: ${error.message}`));
        return;
      }
      
      // Write args to a JSON file to avoid command-line escaping issues on Windows
      let argsToPass = [];
      if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('{')) {
        // If first arg looks like JSON, write it to a file and pass file path instead
        try {
          fs.writeFileSync(argsFile, args[0], 'utf8');
          argsToPass = [argsFile];
          logger.info(`Arguments written to file: ${argsFile}`);
        } catch (error) {
          logger.warn(`Failed to write args file, using direct args: ${error.message}`);
          argsToPass = args;
        }
      } else {
        argsToPass = args;
      }
      
      logger.info(`Executing Python script with ${argsToPass.length} argument(s)`);
      
      // Determine Python commands to try based on OS
      const isWindows = os.platform() === 'win32';
      const pythonCommands = isWindows 
        ? ['python', 'python3', 'py']  // On Windows, try 'python' first (most common), then 'py' launcher
        : ['python3', 'python'];        // On Unix-like, try python3 first
      
      let python = null;
      let commandUsed = null;
      let attemptIndex = 0;
      let cleanupDone = false;
      
      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        try {
          if (fs.existsSync(pythonScript)) {
            fs.unlinkSync(pythonScript);
          }
          if (fs.existsSync(argsFile)) {
            fs.unlinkSync(argsFile);
          }
        } catch (e) {
          logger.warn(`Failed to cleanup temp files: ${e.message}`);
        }
      };
      
      const tryPythonCommand = () => {
        if (attemptIndex >= pythonCommands.length) {
          // All commands failed - cleanup before rejecting
          cleanup();
          const errorMsg = isWindows
            ? 'Python not found. On Windows, try installing Python from python.org or use "py" launcher. Make sure Python is in your PATH.'
            : 'Python not found. Please install Python and ensure it is in your PATH.';
          reject(new Error(errorMsg));
          return;
        }
        
        const cmd = pythonCommands[attemptIndex];
        attemptIndex++;
        
        try {
          logger.info(`Trying Python command: ${cmd}`);
          // Force UTF-8 mode for Python on Windows to avoid cp1252 encoding issues
          // PYTHONUTF8=1 enables UTF-8 mode (affects locale/preferred encoding)
          // PYTHONIOENCODING ensures stdio streams are utf-8
          const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };
          // Use -X utf8 to force UTF-8 mode even when Windows console/codepage defaults to cp1252
          // Works for python/python3 and is forwarded by the Windows "py" launcher as well.
          python = spawn(cmd, ['-X', 'utf8', pythonScript, ...argsToPass], {
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            encoding: 'utf8',
            env: env
          });
          
          commandUsed = cmd;
          
          let stdout = '';
          let stderr = '';
          let hasOutput = false;
          
          python.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            hasOutput = true;
            logger.debug(`Python stdout: ${output.substring(0, 200)}`);
          });
          
          python.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            logger.warn(`Python stderr: ${output.substring(0, 200)}`);
          });
          
          // Set a timeout for the Python script (5 minutes)
          const timeout = setTimeout(() => {
            python.kill();
            cleanup();
            reject(new Error(`Python script timed out after 5 minutes. stderr: ${stderr.substring(0, 500)}`));
          }, 300000);
          
          python.on('close', (code) => {
            clearTimeout(timeout);
            
            logger.info(`Python script exited with code: ${code}`);
            
            if (code !== 0) {
              // Check if command was not found (common error messages)
              const errorMsg = stderr || stdout || 'Unknown error';
              const isCommandNotFound = 
                errorMsg.includes('not recognized') ||
                errorMsg.includes('not found') ||
                errorMsg.includes('ENOENT') ||
                errorMsg.includes('can\'t open file') ||
                (isWindows && code === 9009) ||
                (!isWindows && code === 127);
              
              // If command not found and we have more commands to try, try next one (don't cleanup yet)
              if (isCommandNotFound && attemptIndex < pythonCommands.length) {
                logger.warn(`Command "${cmd}" not found (code: ${code}), trying next command...`);
                tryPythonCommand();
                return;
              }
              
              // All attempts failed or non-command-not-found error - cleanup and reject
              cleanup();
              reject(new Error(`Python script failed with code ${code}: ${errorMsg.substring(0, 500)}`));
            } else {
              // Success - cleanup and resolve
              cleanup();
              try {
                // Try to find JSON in stdout
                const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const result = JSON.parse(jsonMatch[0]);
                  logger.info(`Python script succeeded. Records: ${result.totalRecords || 0}`);
                  resolve(result);
                } else if (stdout.trim()) {
                  logger.warn(`Python output is not JSON: ${stdout.substring(0, 200)}`);
                  resolve({ output: stdout, success: false, error: 'Output is not valid JSON' });
                } else {
                  logger.warn('Python script returned empty output');
                  resolve({ success: false, error: 'Empty output from Python script' });
                }
              } catch (e) {
                logger.error(`Failed to parse Python output as JSON: ${e.message}`);
                logger.error(`Raw stdout: ${stdout.substring(0, 500)}`);
                reject(new Error(`Failed to parse Python output: ${e.message}. Output: ${stdout.substring(0, 200)}`));
              }
            }
          });
          
          python.on('error', (error) => {
            clearTimeout(timeout);
            // If spawn failed, try next command (don't cleanup yet)
            if (error.code === 'ENOENT' || error.message.includes('not found')) {
              logger.warn(`Command "${cmd}" not found: ${error.message}, trying next command...`);
              tryPythonCommand();
            } else {
              cleanup();
              logger.error(`Python process error: ${error.message}`);
              reject(new Error(`Failed to start Python process: ${error.message}. Make sure Python and googleads library are installed.`));
            }
          });
          
          logger.info(`Using Python command: ${cmd}`);
        } catch (error) {
          // If spawn failed synchronously, try next command (don't cleanup yet)
          logger.warn(`Failed to spawn "${cmd}": ${error.message}, trying next command...`);
          tryPythonCommand();
        }
      };
      
      // Start trying commands
      tryPythonCommand();
    });
  }

  async fetchReportData(reportQuery) {
    // Convert to absolute path for Python
    const absoluteConfigPath = path.resolve(this.configPath).replace(/\\/g, '/');
    logger.info(`Using config file: ${absoluteConfigPath}`);
    
    const pythonScript = `import sys
import json
import os
from datetime import datetime
import tempfile
import gzip

# Force UTF-8 (helps on Windows where default can be cp1252)
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

try:
    from googleads import ad_manager
    # Load configuration with absolute path
    config_path = r"${absoluteConfigPath}"
    if not os.path.exists(config_path):
        error_result = {
            'success': False,
            'error': f'Config file not found: {config_path}',
            'errorType': 'FileNotFoundError'
        }
        print(json.dumps(error_result))
        sys.exit(1)
    
    client = ad_manager.AdManagerClient.LoadFromStorage(config_path)
    
    # Parse report query from JSON (either from file or command line arg)
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        # Check if it's a file path (ends with .json)
        if arg.endswith('.json') and os.path.exists(arg):
            with open(arg, 'r', encoding='utf-8') as f:
                report_query = json.load(f)
        else:
            # Try to parse as JSON string
            report_query = json.loads(arg)
    else:
        error_result = {
            'success': False,
            'error': 'No report query provided',
            'errorType': 'ValueError'
        }
        print(json.dumps(error_result))
        sys.exit(1)
    
    # Initialize ReportService
    report_service = client.GetService('ReportService', version='v202505')
    
    # Create report job
    report_job = {'reportQuery': report_query}
    
    # Run report using DataDownloader
    report_downloader = client.GetDataDownloader(version='v202505')
    report_job_id = report_downloader.WaitForReport(report_job)
    
    # Download report
    export_format = 'CSV_DUMP'
    report_file = tempfile.NamedTemporaryFile(suffix='.csv.gz', delete=False)
    report_downloader.DownloadReportToFile(report_job_id, export_format, report_file)
    report_file.close()
    
    # Parse CSV
    csv_content = ''
    if report_file.name.endswith('.gz'):
        with gzip.open(report_file.name, 'rt', encoding='utf-8') as f:
            csv_content = f.read()
    else:
        with open(report_file.name, 'r', encoding='utf-8') as f:
            csv_content = f.read()
    
    # Parse CSV to JSON
    lines = csv_content.strip().split('\\n')
    if len(lines) < 2:
        result = {'success': False, 'error': 'No data in report'}
    else:
        headers = lines[0].split(',')
        data = []
        for line in lines[1:]:
            if line.strip():
                values = line.split(',')
                if len(values) >= len(headers):
                    row = {}
                    for j, header in enumerate(headers):
                        row[header.strip()] = values[j].strip() if j < len(values) else ''
                    data.append(row)
        
        result = {
            'success': True,
            'reportJobId': str(report_job_id),
            'totalRecords': len(data),
            'data': data
        }
    
    # Clean up
    os.unlink(report_file.name)
    
    print(json.dumps(result))
except Exception as e:
    error_result = {
        'success': False,
        'error': str(e),
        'errorType': type(e).__name__
    }
    print(json.dumps(error_result))
    sys.exit(1)
`;
      
    try {
      const reportQueryJson = JSON.stringify(reportQuery);
      logger.info(`Calling Python script with report query (${reportQueryJson.length} chars)...`);
      logger.debug(`Report query: ${JSON.stringify(reportQuery).substring(0, 200)}...`);
      
      const result = await this.runPythonScript(pythonScript, [reportQueryJson]);
      
      logger.info(`Python script completed. Success: ${result.success}, Records: ${result.totalRecords || 0}`);
      
      if (result.success === false) {
        const errorMsg = result.error || 'Unknown error from Python script';
        logger.error(`Python script returned error: ${errorMsg}`);
        if (result.traceback) {
          logger.error(`Python traceback: ${result.traceback}`);
        }
        throw new Error(errorMsg);
      }
      
      if (!result.data || result.data.length === 0) {
        logger.warn('Python script returned no data');
        return [];
      }
      
      logger.info(`Returning ${result.data.length} records from Python bridge`);
      return result.data;
    } catch (error) {
      logger.error(`Error in Python bridge fetchReportData: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      throw error;
    }
  }

  async getDataDownloader(version = 'v202505') {
    const self = this;
    
    return {
      WaitForReport: async (reportJob) => {
        // For Python bridge, we fetch the data immediately
        logger.info('Python bridge: Fetching report data...');
        const reportQuery = reportJob.reportQuery;
        self.lastReportData = await self.fetchReportData(reportQuery);
        logger.info(`Python bridge: Retrieved ${self.lastReportData.length} rows`);
        // Return a mock report job ID
        return 'python_bridge_' + Date.now();
      }
    };
  }

  async getReportDownloadUrl(reportJobId, exportFormat, version = 'v202505') {
    // Python bridge handles download internally, so we return a placeholder
    return `python_bridge://${reportJobId}`;
  }

  async downloadAndParseReport(downloadUrl, models = null) {
    // For Python bridge, return the data we already fetched
    if (this.lastReportData) {
      const data = this.lastReportData;
      this.lastReportData = null; // Clear after use
      return data;
    }
    throw new Error('No report data available. Make sure WaitForReport was called first.');
  }

  /**
   * Fetch month-to-date data with app dimensions (MOBILE_APP_RESOLVED_ID, MOBILE_APP_NAME, MOBILE_INVENTORY_TYPE, INVENTORY_FORMAT, LINE_ITEM_NAME, DOMAIN)
   * Similar to Python version's get_month_to_date_data()
   */
  async fetchMonthToDateDataWithApps() {
    try {
      // Calculate date range: 1st of current month to today
      const now = new Date();
      // Get first day of current month at midnight
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // Get today's date (current date)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const startDateStr = formatDate(firstDayOfMonth);
      const endDateStr = formatDate(today);

      logger.info(`Fetching month-to-date data from: ${startDateStr} to ${endDateStr}`);

      // Create report query with app dimensions (matching Python version)
      const reportQuery = {
        dimensions: [
          'SITE_NAME',
          'DATE',
          'COUNTRY_NAME',
          'AD_UNIT_NAME',
          'MOBILE_APP_RESOLVED_ID',
          'MOBILE_APP_NAME',
          'MOBILE_INVENTORY_TYPE',
          'INVENTORY_FORMAT',
          'LINE_ITEM_NAME',
          'DOMAIN'
        ],
        columns: [
          'AD_EXCHANGE_LINE_ITEM_LEVEL_IMPRESSIONS',
          'AD_EXCHANGE_LINE_ITEM_LEVEL_CLICKS',
          'AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE',
          'AD_EXCHANGE_LINE_ITEM_LEVEL_CTR',
          'AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM',
          'AD_EXCHANGE_TOTAL_REQUESTS',
          'AD_EXCHANGE_COST_PER_CLICK',
          'AD_EXCHANGE_MATCH_RATE'
        ],
        dateRangeType: 'CUSTOM_DATE',
        startDate: {
          year: firstDayOfMonth.getFullYear(),
          month: firstDayOfMonth.getMonth() + 1,
          day: firstDayOfMonth.getDate()
        },
        endDate: {
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate()
        }
      };

      logger.info(`Report query dimensions: ${reportQuery.dimensions.join(', ')}`);
      logger.info(`Date Range: ${startDateStr} to ${endDateStr}`);

      // Fetch data using Python bridge
      const rawData = await this.fetchReportData(reportQuery);
      
      logger.info(`Retrieved ${rawData.length} rows of month-to-date data with app dimensions`);
      return rawData;
    } catch (error) {
      logger.error(`Error in fetchMonthToDateDataWithApps: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process and store app data in MongoDB
   * Similar to Python version's process_and_store_data()
   * @param {Array} rawData - Raw data from GAM API
   * @param {Object} AdUnitReportModel - Mongoose model for AdUnitReport
   * @returns {Promise<Object>} - Result with success status and records processed
   */
  async processAndStoreAppData(rawData, AdUnitReportModel) {
    try {
      if (!rawData || rawData.length === 0) {
        logger.warn('No data to process');
        return { success: false, recordsProcessed: 0, message: 'No data to process' };
      }

      // Group data by site and date - create separate records for each date
      const siteData = {};

      for (const row of rawData) {
        const siteName = row['Dimension.SITE_NAME'] || row['SITE_NAME'] || 'N/A';
        const date = row['Dimension.DATE'] || row['DATE'] || 'N/A';
        const country = row['Dimension.COUNTRY_NAME'] || row['COUNTRY_NAME'] || 'N/A';
        const adUnitName = row['Dimension.AD_UNIT_NAME'] || row['AD_UNIT_NAME'] || 'N/A';
        let appId = row['Dimension.MOBILE_APP_RESOLVED_ID'] || row['MOBILE_APP_RESOLVED_ID'] || 'N/A';
        let appName = row['Dimension.MOBILE_APP_NAME'] || row['MOBILE_APP_NAME'] || 'N/A';
        let mobileInventoryType = row['Dimension.MOBILE_INVENTORY_TYPE'] || row['MOBILE_INVENTORY_TYPE'] || 'N/A';
        let inventoryFormat = row['Dimension.INVENTORY_FORMAT'] || row['INVENTORY_FORMAT'] || 'N/A';
        let lineItemName = row['Dimension.LINE_ITEM_NAME'] || row['LINE_ITEM_NAME'] || 'N/A';
        let domain = row['Dimension.DOMAIN'] || row['DOMAIN'] || 'N/A';

        // Normalize app ID - handle special values
        if (appId === '(Not applicable)' || appId === 'null' || appId === 'unidentified' || appId === '' || !appId) {
          appId = '(Not applicable)';
        }

        // Normalize app name - handle special values
        if (appName === '(Not applicable)' || appName === 'null' || appName === 'unidentified' || appName === '' || !appName) {
          appName = '(Not applicable)';
        }

        // Normalize mobile inventory type - handle special values
        if (mobileInventoryType === '(Not applicable)' || mobileInventoryType === 'null' || mobileInventoryType === 'unidentified' || mobileInventoryType === '' || !mobileInventoryType) {
          mobileInventoryType = '(Not applicable)';
        }

        // Normalize inventory format - handle special values
        if (inventoryFormat === '(Not applicable)' || inventoryFormat === 'null' || inventoryFormat === 'unidentified' || inventoryFormat === '' || !inventoryFormat) {
          inventoryFormat = '(Not applicable)';
        }

        // Normalize line item name - handle special values
        if (lineItemName === '(Not applicable)' || lineItemName === 'null' || lineItemName === 'unidentified' || lineItemName === '' || !lineItemName) {
          lineItemName = '(Not applicable)';
        }

        // Normalize domain - handle special values
        if (domain === '(Not applicable)' || domain === 'null' || domain === 'unidentified' || domain === '' || !domain) {
          domain = '(Not applicable)';
        }

        // Skip if any required dimension is missing
        if (siteName === 'N/A' || date === 'N/A' || country === 'N/A' || adUnitName === 'N/A') {
          continue;
        }

        // Create unique key for site + date combination
        const siteDateKey = `${siteName}_${date}`;

        // Convert date to MongoDB Date format
        let mongoDate;
        try {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) {
            // Try parsing YYYY-MM-DD format
            const [year, month, day] = date.split('-');
            mongoDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            mongoDate = dateObj;
          }
        } catch (e) {
          logger.warn(`Failed to parse date: ${date}, using current date`);
          mongoDate = new Date();
        }

        // Initialize site data if not exists for this site-date combination
        if (!siteData[siteDateKey]) {
          siteData[siteDateKey] = {
            date: mongoDate,
            site: siteName,
            domain: domain !== '(Not applicable)' && domain !== 'N/A' ? domain : null,
            isDeleted: false,
            impressions: 0,
            clicks: 0,
            ctr: 0.0,
            ecpm: 0.0,
            revenue: 0.0,
            totalRequests: 0,
            costPerClick: 0.0,
            matchRate: 0.0,
            adUnits: new Map()
          };
        } else {
          // Update domain if current row has a valid domain (always prefer valid domain over null or "(Not applicable)")
          if (domain !== '(Not applicable)' && domain !== 'N/A' && domain) {
            // Always update if we have a valid domain, or if current domain is null/not set
            if (!siteData[siteDateKey].domain || siteData[siteDateKey].domain === null) {
              siteData[siteDateKey].domain = domain;
            }
          }
        }

        // Get metrics for this row
        const impressions = parseInt(parseFloat(row['Column.AD_EXCHANGE_LINE_ITEM_LEVEL_IMPRESSIONS'] || row['AD_EXCHANGE_LINE_ITEM_LEVEL_IMPRESSIONS'] || 0));
        const clicks = parseInt(parseFloat(row['Column.AD_EXCHANGE_LINE_ITEM_LEVEL_CLICKS'] || row['AD_EXCHANGE_LINE_ITEM_LEVEL_CLICKS'] || 0));
        const ctr = parseFloat(row['Column.AD_EXCHANGE_LINE_ITEM_LEVEL_CTR'] || row['AD_EXCHANGE_LINE_ITEM_LEVEL_CTR'] || 0);
        const ecpm = parseFloat(row['Column.AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM'] || row['AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM'] || 0);
        const revenueMicros = parseFloat(row['Column.AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE'] || row['AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE'] || 0);
        const revenue = revenueMicros / 1000000.0;
        const totalRequests = parseInt(parseFloat(row['Column.AD_EXCHANGE_TOTAL_REQUESTS'] || row['AD_EXCHANGE_TOTAL_REQUESTS'] || 0));
        const costPerClickMicros = parseFloat(row['Column.AD_EXCHANGE_COST_PER_CLICK'] || row['AD_EXCHANGE_COST_PER_CLICK'] || 0);
        const costPerClick = costPerClickMicros / 1000000.0;
        const matchRate = parseFloat(row['Column.AD_EXCHANGE_MATCH_RATE'] || row['AD_EXCHANGE_MATCH_RATE'] || 0);

        // Add to site totals
        siteData[siteDateKey].impressions += impressions;
        siteData[siteDateKey].clicks += clicks;
        siteData[siteDateKey].revenue += revenue;
        siteData[siteDateKey].totalRequests += totalRequests;

        // Track match rate values for averaging
        if (!siteData[siteDateKey].matchRate_values) {
          siteData[siteDateKey].matchRate_values = [];
        }
        siteData[siteDateKey].matchRate_values.push(matchRate);

        // Initialize ad unit data if not exists
        if (!siteData[siteDateKey].adUnits.has(adUnitName)) {
          siteData[siteDateKey].adUnits.set(adUnitName, {
            impressions: 0,
            clicks: 0,
            ctr: 0.0,
            ecpm: 0.0,
            revenue: 0.0,
            totalRequests: 0,
            costPerClick: 0.0,
            matchRate: 0.0,
            countries: new Map(),
            apps: new Map(),
            matchRate_values: []
          });
        }

        const adUnitData = siteData[siteDateKey].adUnits.get(adUnitName);

        // Add to ad unit totals
        adUnitData.impressions += impressions;
        adUnitData.clicks += clicks;
        adUnitData.revenue += revenue;
        adUnitData.totalRequests += totalRequests;
        adUnitData.matchRate_values.push(matchRate);

        // Initialize country data within ad unit if not exists
        if (!adUnitData.countries.has(country)) {
          adUnitData.countries.set(country, {
            impressions: 0,
            clicks: 0,
            ctr: 0.0,
            ecpm: 0.0,
            revenue: 0.0,
            totalRequests: 0,
            costPerClick: 0.0,
            matchRate: 0.0,
            matchRate_values: []
          });
        }

        const countryData = adUnitData.countries.get(country);
        countryData.impressions += impressions;
        countryData.clicks += clicks;
        countryData.revenue += revenue;
        countryData.totalRequests += totalRequests;
        countryData.matchRate_values.push(matchRate);

        // Create composite key for app data: appId + inventoryFormat + lineItemName
        // This allows proper breakdown by inventory format and line item
        // Domain is stored at site level, not in app objects
        const appKey = `${appId}_${inventoryFormat}_${lineItemName}`;

        // Initialize app data within ad unit if not exists
        if (!adUnitData.apps.has(appKey)) {
          adUnitData.apps.set(appKey, {
            appName: appName,
            mobileInventoryType: mobileInventoryType,
            inventoryFormat: inventoryFormat,
            lineItemName: lineItemName,
            impressions: 0,
            clicks: 0,
            ctr: 0.0,
            ecpm: 0.0,
            revenue: 0.0,
            totalRequests: 0,
            costPerClick: 0.0,
            matchRate: 0.0,
            matchRate_values: []
          });
        }

        const appData = adUnitData.apps.get(appKey);
        appData.impressions += impressions;
        appData.clicks += clicks;
        appData.revenue += revenue;
        appData.totalRequests += totalRequests;
        appData.matchRate_values.push(matchRate);
      }

      // Calculate metrics for each level
      for (const siteDateKey in siteData) {
        const siteDataItem = siteData[siteDateKey];

        // Round revenue
        siteDataItem.revenue = Math.round(siteDataItem.revenue * 10000) / 10000;

        // Calculate CTR and ECPM
        if (siteDataItem.impressions > 0) {
          siteDataItem.ctr = Math.round((siteDataItem.clicks / siteDataItem.impressions) * 10000) / 100;
          siteDataItem.ecpm = Math.round((siteDataItem.revenue / siteDataItem.impressions) * 1000000) / 10000;
        }

        // Calculate costPerClick
        if (siteDataItem.clicks > 0) {
          siteDataItem.costPerClick = Math.round((siteDataItem.revenue / siteDataItem.clicks) * 10000) / 10000;
        }

        // Calculate average matchRate
        if (siteDataItem.matchRate_values && siteDataItem.matchRate_values.length > 0) {
          siteDataItem.matchRate = Math.round((siteDataItem.matchRate_values.reduce((a, b) => a + b, 0) / siteDataItem.matchRate_values.length) * 10000) / 100;
          delete siteDataItem.matchRate_values;
        }

        // Process ad units
        for (const [adUnitName, adUnitData] of siteDataItem.adUnits.entries()) {
          adUnitData.revenue = Math.round(adUnitData.revenue * 10000) / 10000;

          if (adUnitData.impressions > 0) {
            adUnitData.ctr = Math.round((adUnitData.clicks / adUnitData.impressions) * 10000) / 100;
            adUnitData.ecpm = Math.round((adUnitData.revenue / adUnitData.impressions) * 1000000) / 10000;
          }

          if (adUnitData.clicks > 0) {
            adUnitData.costPerClick = Math.round((adUnitData.revenue / adUnitData.clicks) * 10000) / 10000;
          }

          if (adUnitData.matchRate_values && adUnitData.matchRate_values.length > 0) {
            adUnitData.matchRate = Math.round((adUnitData.matchRate_values.reduce((a, b) => a + b, 0) / adUnitData.matchRate_values.length) * 10000) / 100;
            delete adUnitData.matchRate_values;
          }

          // Process countries
          for (const [country, countryData] of adUnitData.countries.entries()) {
            countryData.revenue = Math.round(countryData.revenue * 10000) / 10000;

            if (countryData.impressions > 0) {
              countryData.ctr = Math.round((countryData.clicks / countryData.impressions) * 10000) / 100;
              countryData.ecpm = Math.round((countryData.revenue / countryData.impressions) * 1000000) / 10000;
            }

            if (countryData.clicks > 0) {
              countryData.costPerClick = Math.round((countryData.revenue / countryData.clicks) * 10000) / 10000;
            }

            if (countryData.matchRate_values && countryData.matchRate_values.length > 0) {
              countryData.matchRate = Math.round((countryData.matchRate_values.reduce((a, b) => a + b, 0) / countryData.matchRate_values.length) * 10000) / 100;
              delete countryData.matchRate_values;
            }
          }

          // Process apps
          for (const [appId, appData] of adUnitData.apps.entries()) {
            appData.revenue = Math.round(appData.revenue * 10000) / 10000;

            if (appData.impressions > 0) {
              appData.ctr = Math.round((appData.clicks / appData.impressions) * 10000) / 100;
              appData.ecpm = Math.round((appData.revenue / appData.impressions) * 1000000) / 10000;
            }

            if (appData.clicks > 0) {
              appData.costPerClick = Math.round((appData.revenue / appData.clicks) * 10000) / 10000;
            }

            if (appData.matchRate_values && appData.matchRate_values.length > 0) {
              appData.matchRate = Math.round((appData.matchRate_values.reduce((a, b) => a + b, 0) / appData.matchRate_values.length) * 10000) / 100;
              delete appData.matchRate_values;
            }
          }
        }
      }

      // Convert Maps to plain objects - Mongoose will handle Map conversion automatically
      const processedData = [];
      for (const siteDateKey in siteData) {
        const data = siteData[siteDateKey];
        const adUnitsObj = {};

        for (const [adUnitName, adUnitData] of data.adUnits.entries()) {
          // Convert countries Map to plain object
          // Encode country names to handle dots (e.g., "U.S. Virgin Islands") for Mongoose Maps
          const countriesObj = {};
          for (const [country, countryData] of adUnitData.countries.entries()) {
            // Encode country name to handle dots (Mongoose Maps limitation)
            const encodedCountry = country.replace(/\./g, 'DOT');
            countriesObj[encodedCountry] = countryData;
          }

          // Convert apps Map to plain object
          const appsObj = {};
          for (const [appId, appData] of adUnitData.apps.entries()) {
            appsObj[appId] = appData;
          }

          // Create ad unit object with plain objects (Mongoose will convert to Maps)
          adUnitsObj[adUnitName] = {
            impressions: adUnitData.impressions,
            clicks: adUnitData.clicks,
            ctr: adUnitData.ctr,
            ecpm: adUnitData.ecpm,
            revenue: adUnitData.revenue,
            totalRequests: adUnitData.totalRequests,
            costPerClick: adUnitData.costPerClick,
            matchRate: adUnitData.matchRate,
            countries: countriesObj,
            apps: appsObj
          };
        }

        // Domain is stored at site level, not in app objects
        const siteDomain = data.domain || null;

        processedData.push({
          date: data.date,
          site: data.site,
          domain: siteDomain || null,
          isDeleted: data.isDeleted,
          impressions: data.impressions,
          clicks: data.clicks,
          ctr: data.ctr,
          ecpm: data.ecpm,
          revenue: data.revenue,
          totalRequests: data.totalRequests,
          costPerClick: data.costPerClick,
          matchRate: data.matchRate,
          adUnits: adUnitsObj
        });
      }

      // Store in MongoDB
      let storedCount = 0;
      for (const data of processedData) {
        try {
          // Check if data already exists for this date and site
          const existing = await AdUnitReportModel.findOne({
            date: data.date,
            site: data.site
          });

          if (existing) {
            logger.info(`Data already exists for ${data.site} on ${data.date}, updating...`);
            
            // Update top-level fields
            existing.impressions = data.impressions;
            existing.clicks = data.clicks;
            existing.ctr = data.ctr;
            existing.ecpm = data.ecpm;
            existing.revenue = data.revenue;
            existing.totalRequests = data.totalRequests;
            existing.costPerClick = data.costPerClick;
            existing.matchRate = data.matchRate;
            existing.domain = data.domain;
            existing.isDeleted = data.isDeleted;
            
            // Clear existing adUnits Map and set new values
            existing.adUnits.clear();
            for (const [adUnitName, adUnitData] of Object.entries(data.adUnits)) {
              // Create the ad unit object without nested Maps (Mongoose will create them from schema defaults)
              const adUnitObj = {
                impressions: adUnitData.impressions,
                clicks: adUnitData.clicks,
                ctr: adUnitData.ctr,
                ecpm: adUnitData.ecpm,
                revenue: adUnitData.revenue,
                totalRequests: adUnitData.totalRequests,
                costPerClick: adUnitData.costPerClick,
                matchRate: adUnitData.matchRate
              };
              
              // Set the ad unit in the Map (Mongoose will initialize countries and apps Maps from schema defaults)
              existing.adUnits.set(adUnitName, adUnitObj);
              
              // Get the ad unit Map entry - Mongoose Maps should now be initialized
              const adUnitMapEntry = existing.adUnits.get(adUnitName);
              
              // Set countries Map by assigning the entire object (Mongoose will convert to Map)
              // Note: Country names are already encoded when converting from Map to plain object
              if (adUnitData.countries && Object.keys(adUnitData.countries).length > 0) {
                // Convert the encoded countries object to a Map-like structure
                const countriesMap = {};
                for (const [encodedCountry, countryData] of Object.entries(adUnitData.countries)) {
                  // Country names are already encoded (dots replaced with 'DOT')
                  countriesMap[encodedCountry] = countryData;
                }
                // Set the entire countries object at once
                adUnitMapEntry.countries = countriesMap;
                // Mark the path as modified
                existing.markModified(`adUnits.${adUnitName}.countries`);
              }
              
              // Set apps Map by assigning the entire object (Mongoose will convert to Map)
              if (adUnitData.apps && Object.keys(adUnitData.apps).length > 0) {
                // Encode app IDs and convert to Map-like structure
                const appsMap = {};
                for (const [appId, appData] of Object.entries(adUnitData.apps)) {
                  // Encode app ID to handle dots (Mongoose Maps limitation)
                  const encodedAppId = appId.replace(/\./g, 'DOT');
                  appsMap[encodedAppId] = appData;
                }
                // Set the entire apps object at once
                adUnitMapEntry.apps = appsMap;
                // Mark the path as modified
                existing.markModified(`adUnits.${adUnitName}.apps`);
              }
            }
            
            await existing.save();
          } else {
            // Create new document with basic fields first
            const newDoc = new AdUnitReportModel({
              date: data.date,
              site: data.site,
              domain: data.domain,
              isDeleted: data.isDeleted,
              impressions: data.impressions,
              clicks: data.clicks,
              ctr: data.ctr,
              ecpm: data.ecpm,
              revenue: data.revenue,
              totalRequests: data.totalRequests,
              costPerClick: data.costPerClick,
              matchRate: data.matchRate
            });
            
            // Set adUnits Map with nested Maps
            for (const [adUnitName, adUnitData] of Object.entries(data.adUnits)) {
              // Create the ad unit object without nested Maps (Mongoose will create them from schema defaults)
              const adUnitObj = {
                impressions: adUnitData.impressions,
                clicks: adUnitData.clicks,
                ctr: adUnitData.ctr,
                ecpm: adUnitData.ecpm,
                revenue: adUnitData.revenue,
                totalRequests: adUnitData.totalRequests,
                costPerClick: adUnitData.costPerClick,
                matchRate: adUnitData.matchRate
              };
              
              // Set the ad unit in the Map (Mongoose will initialize countries and apps Maps from schema defaults)
              newDoc.adUnits.set(adUnitName, adUnitObj);
              
              // Now get the ad unit Map entry - Mongoose Maps should now be initialized
              const adUnitMapEntry = newDoc.adUnits.get(adUnitName);
              
              // Set countries Map by assigning the entire object (Mongoose will convert to Map)
              // Note: Country names are already encoded when converting from Map to plain object
              if (adUnitData.countries && Object.keys(adUnitData.countries).length > 0) {
                // Convert the encoded countries object to a Map-like structure
                const countriesMap = {};
                for (const [encodedCountry, countryData] of Object.entries(adUnitData.countries)) {
                  // Country names are already encoded (dots replaced with 'DOT')
                  countriesMap[encodedCountry] = countryData;
                }
                // Set the entire countries object at once
                adUnitMapEntry.countries = countriesMap;
              }
              
              // Set apps Map by assigning the entire object (Mongoose will convert to Map)
              if (adUnitData.apps && Object.keys(adUnitData.apps).length > 0) {
                // Encode app IDs and convert to Map-like structure
                const appsMap = {};
                for (const [appId, appData] of Object.entries(adUnitData.apps)) {
                  // Encode app ID to handle dots (Mongoose Maps limitation)
                  const encodedAppId = appId.replace(/\./g, 'DOT');
                  appsMap[encodedAppId] = appData;
                }
                // Set the entire apps object at once
                adUnitMapEntry.apps = appsMap;
              }
            }
            
            await newDoc.save();
            storedCount++;
            logger.info(`Stored data for ${data.site} on ${data.date}`);
          }
        } catch (error) {
          logger.error(`Error storing data for ${data.site} on ${data.date}: ${error.message}`);
          if (error.errors) {
            // Log validation errors in detail
            Object.keys(error.errors).forEach(key => {
              logger.error(`  Validation error for ${key}: ${error.errors[key].message}`);
            });
          }
          // Log the problematic data structure for debugging
          if (error.message.includes('Cast to Map failed')) {
            const problematicData = JSON.stringify(data, null, 2);
            logger.error(`  Problematic data structure (first 1000 chars): ${problematicData.substring(0, 1000)}`);
          }
        }
      }

      logger.info(`Successfully processed and stored data for ${storedCount} site-date combinations`);
      return {
        success: true,
        recordsProcessed: rawData.length,
        storedCount: storedCount
      };
    } catch (error) {
      logger.error(`Error processing and storing app data: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      return {
        success: false,
        recordsProcessed: 0,
        error: error.message
      };
    }
  }

  /**
   * Clear previous data from MongoDB collection
   * @param {Object} AdUnitReportModel - Mongoose model for AdUnitReport
   * @returns {Promise<Object>} - Result with deleted count
   */
  async clearPreviousData(AdUnitReportModel) {
    try {
      logger.info('Clearing previous data from MongoDB...');
      const result = await AdUnitReportModel.deleteMany({});
      logger.info(`Cleared ${result.deletedCount} previous records from MongoDB`);
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      logger.error(`Error clearing previous data: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crawl month-to-date data with app information
   * Main function that fetches, processes, and stores app data
   * @param {Object} AdUnitReportModel - Mongoose model for AdUnitReport
   * @param {Boolean} clearPrevious - Whether to clear previous data before storing new data
   * @returns {Promise<Object>} - Result with success status and records processed
   */
  async crawlMonthToDateDataWithApps(AdUnitReportModel, clearPrevious = true) {
    const startTime = new Date();
    
    try {
      logger.info('Starting month-to-date GAM data crawl with app information...');

      // Step 1: Clear previous data if requested
      if (clearPrevious) {
        logger.info('Step 1: Clearing previous data...');
        await this.clearPreviousData(AdUnitReportModel);
      }

      // Step 2: Get month-to-date data with app dimensions
      logger.info('Step 2: Fetching month-to-date data with app dimensions...');
      const rawData = await this.fetchMonthToDateDataWithApps();

      if (!rawData || rawData.length === 0) {
        logger.warning('No data retrieved for month-to-date period');
        return {
          success: false,
          recordsProcessed: 0,
          message: 'No data retrieved'
        };
      }

      logger.info(`Retrieved ${rawData.length} rows of month-to-date data`);

      // Step 3: Process and store data
      logger.info('Step 3: Processing and storing data...');
      const result = await this.processAndStoreAppData(rawData, AdUnitReportModel);

      if (result.success) {
        const duration = (new Date() - startTime) / 1000;
        logger.info(`Month-to-date crawl completed successfully in ${duration.toFixed(2)}s!`);
        return {
          success: true,
          recordsProcessed: result.recordsProcessed,
          storedCount: result.storedCount,
          duration: duration
        };
      } else {
        logger.error('Month-to-date crawl failed during data processing');
        return {
          success: false,
          recordsProcessed: 0,
          error: result.error || 'Failed during data processing'
        };
      }
    } catch (error) {
      const duration = (new Date() - startTime) / 1000;
      logger.error(`Error in month-to-date crawl: ${error.message}`);
      return {
        success: false,
        recordsProcessed: 0,
        error: error.message,
        duration: duration
      };
    }
  }
}

export default GAMClientPythonBridge;

