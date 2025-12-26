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
      const keyPath = path.resolve(path.dirname(this.configPath), this.config.ad_manager.path_to_private_key_file);
      if (!fs.existsSync(keyPath)) {
        logger.warn(`Service account key file not found at: ${keyPath}`);
        logger.warn(`Config says: ${this.config.ad_manager.path_to_private_key_file}`);
      } else {
        logger.info(`Service account key file found: ${keyPath}`);
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
      
      // Write temporary Python script
      try {
        fs.writeFileSync(pythonScript, scriptContent, 'utf8');
        logger.info(`Python script written to: ${pythonScript}`);
      } catch (error) {
        reject(new Error(`Failed to write Python script: ${error.message}`));
        return;
      }
      
      logger.info(`Executing Python script with args: ${args.join(' ')}`);
      
      // Determine Python commands to try based on OS
      const isWindows = os.platform() === 'win32';
      const pythonCommands = isWindows 
        ? ['python', 'python3', 'py']  // On Windows, try 'python' first (most common), then 'py' launcher
        : ['python3', 'python'];        // On Unix-like, try python3 first
      
      let python = null;
      let commandUsed = null;
      let attemptIndex = 0;
      
      const tryPythonCommand = () => {
        if (attemptIndex >= pythonCommands.length) {
          // All commands failed
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
          python = spawn(cmd, [pythonScript, ...args], {
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe']
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
            reject(new Error(`Python script timed out after 5 minutes. stderr: ${stderr.substring(0, 500)}`));
          }, 300000);
          
          python.on('close', (code) => {
            clearTimeout(timeout);
            
            // Clean up temp file
            try {
              if (fs.existsSync(pythonScript)) {
                fs.unlinkSync(pythonScript);
              }
            } catch (e) {
              logger.warn(`Failed to cleanup temp file: ${e.message}`);
            }
            
            logger.info(`Python script exited with code: ${code}`);
            
            if (code !== 0) {
              // Check if command was not found (common error messages)
              const errorMsg = stderr || stdout || 'Unknown error';
              const isCommandNotFound = 
                errorMsg.includes('not recognized') ||
                errorMsg.includes('not found') ||
                errorMsg.includes('ENOENT') ||
                (isWindows && (code === 9009 || code === 1)) ||
                (!isWindows && code === 127);
              
              // If command not found and we have more commands to try, try next one
              if (isCommandNotFound && attemptIndex < pythonCommands.length) {
                logger.warn(`Command "${cmd}" not found (code: ${code}), trying next command...`);
                tryPythonCommand();
                return;
              }
              
              logger.error(`Python script failed. Code: ${code}, Error: ${errorMsg.substring(0, 500)}`);
              reject(new Error(`Python script failed with code ${code}: ${errorMsg.substring(0, 500)}`));
            } else {
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
            // If spawn failed, try next command
            if (error.code === 'ENOENT' || error.message.includes('not found')) {
              logger.warn(`Command "${cmd}" not found: ${error.message}, trying next command...`);
              tryPythonCommand();
            } else {
              logger.error(`Python process error: ${error.message}`);
              reject(new Error(`Failed to start Python process: ${error.message}. Make sure Python and googleads library are installed.`));
            }
          });
          
          logger.info(`Using Python command: ${cmd}`);
        } catch (error) {
          // If spawn failed synchronously, try next command
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
    
    const pythonScript = `
import sys
import json
import os
from googleads import ad_manager
from datetime import datetime
import tempfile
import gzip

try:
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
    
    # Parse report query from JSON
    report_query = json.loads(sys.argv[1])
    
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
}

export default GAMClientPythonBridge;

