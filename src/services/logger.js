import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(logColors);

// Define which transports the logger must use to print out messages
const transports = [
    // Console transport
    new winston.transports.Console({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
            winston.format.colorize({ all: true }),
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
    }),
    
    // Error log file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    }),
    
    // Combined log file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    }),
];

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    levels: logLevels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports,
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Performance monitoring
class PerformanceLogger {
    static startTimer(label) {
        const startTime = process.hrtime.bigint();
        return {
            end: () => {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                logger.info(`Performance: ${label} took ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    static logMemoryUsage() {
        const usage = process.memoryUsage();
        logger.info('Memory Usage', {
            rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
            external: `${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`,
        });
    }

    static logDatabaseQuery(query, duration) {
        logger.debug('Database Query', {
            query: typeof query === 'string' ? query : JSON.stringify(query),
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    }

    static logApiRequest(req, res, duration) {
        logger.http('API Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString()
        });
    }
}

// Request logging middleware
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        PerformanceLogger.logApiRequest(req, res, duration);
    });
    
    next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
    logger.error('Unhandled Error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    
    next(err);
};

// Export logger and performance utilities
export { logger, PerformanceLogger };
export default logger;
