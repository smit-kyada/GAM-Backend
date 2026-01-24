/**
 * Crawler Service for GAM-Backend
 * Handles different crawler types: hourWise, monthToDate, adUnitWise
 */

import mongoose from "mongoose";
import { GenerateAdManagerReport } from './AdManagerReport.js';
import GAMClientPythonBridge from './gamClientPythonBridge.js';
import logger from '../services/logger.js';

const ObjectId = mongoose.Types.ObjectId;

/**
 * Run crawler and log status to crawler_status collection
 * @param {String} crawlerType - Type of crawler: 'hourWise', 'monthToDate', or 'adUnitWise'
 * @param {Object} models - Database models
 * @returns {Promise} - Promise resolving to crawler execution result
 */

export const runCrawler = async (crawlerType, models) => {
    const db = mongoose.connection.db;
    const crawlerStatusCollection = db.collection("crawler_status");
    
    const startTime = new Date();
    let crawlerStatusId = null;
    
    try {
        // Log crawler start
        const statusDoc = {
            startTime: startTime,
            status: "running",
            crawlerType: crawlerType,
            recordsProcessed: 0,
            error: null,
            endTime: null,
            duration: null
        };
        
        const insertResult = await crawlerStatusCollection.insertOne(statusDoc);
        crawlerStatusId = insertResult.insertedId;
        
        logger.info(`🚀 Starting ${crawlerType} crawler (ID: ${crawlerStatusId})`);
        
        // Run the appropriate crawler based on type
        let result;
        switch (crawlerType) {
            case 'hourWise':
                result = await runHourWiseCrawler(models);
                break;
            case 'monthToDate':
                result = await runMonthToDateCrawler(models);
                break;
            case 'adUnitWise':
                result = await runAdUnitWiseCrawler(models);
                break;
            default:
                throw new Error(`Unknown crawler type: ${crawlerType}`);
        }
        
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000; // Duration in seconds
        
        // Update crawler status to completed
        await crawlerStatusCollection.updateOne(
            { _id: crawlerStatusId },
            {
                $set: {
                    endTime: endTime,
                    status: "completed",
                    recordsProcessed: result.recordsProcessed || 0,
                    duration: duration
                }
            }
        );
        
        logger.info(`✅ ${crawlerType} crawler completed in ${duration.toFixed(2)}s. Records: ${result.recordsProcessed || 0}`);
        
        return {
            success: true,
            crawlerType,
            recordsProcessed: result.recordsProcessed || 0,
            duration
        };
        
    } catch (error) {
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        
        logger.error(`❌ ${crawlerType} crawler failed: ${error.message}`);
        
        // Update crawler status to failed
        if (crawlerStatusId) {
            await crawlerStatusCollection.updateOne(
                { _id: crawlerStatusId },
                {
                    $set: {
                        endTime: endTime,
                        status: "failed",
                        error: error.message,
                        duration: duration
                    }
                }
            );
        }
        
        return {
            success: false,
            crawlerType,
            error: error.message,
            duration
        };
    }
};

/**
 * Run hourWise crawler
 * Fetches hourly breakdown data and stores in hourwise collection
 */
const runHourWiseCrawler = async (models) => {
    // For now, use the existing GenerateAdManagerReport
    // In the future, you can customize this to fetch hour-specific data
    const result = await GenerateAdManagerReport();
    
    // Count records in hourwise collection (approximate)
    const recordsCount = await models?.HourWise?.countDocuments({ isDeleted: false }) || 0;
    
    return {
        recordsProcessed: recordsCount,
        result
    };
};

/**
 * Run monthToDate crawler
 * Fetches month-to-date aggregated data and stores in dailyadsmanagerreport collection
 */
const runMonthToDateCrawler = async (models) => {
    // Use GenerateAdManagerReport with month-to-date parameters
    const result = await GenerateAdManagerReport();
    
    // Count records in dailyadsmanagerreport collection (approximate)
    const recordsCount = await models?.DailyAdsManagerReport?.countDocuments({ isDeleted: false }) || 0;
    
    return {
        recordsProcessed: recordsCount,
        result
    };
};

/**
 * Run adUnitWise crawler
 * Fetches ad unit level data with app information and stores in adunitreport collection
 * Uses Python bridge to fetch data with MOBILE_APP_RESOLVED_ID, MOBILE_APP_NAME, MOBILE_INVENTORY_TYPE, INVENTORY_FORMAT, LINE_ITEM_NAME, DOMAIN dimensions
 */
const runAdUnitWiseCrawler = async (models) => {
    try {
        // Use Python bridge to fetch month-to-date data with app dimensions
        logger.info('Starting adUnitWise crawler with Python bridge for app data...');
        
        const pythonBridge = new GAMClientPythonBridge();
        const result = await pythonBridge.crawlMonthToDateDataWithApps(
            models?.AdUnitReport,
            true // Clear previous data before storing new data
        );
        
        if (result.success) {
            logger.info(`✅ AdUnitWise crawler completed. Records processed: ${result.recordsProcessed}, Stored: ${result.storedCount || 0}`);
            return {
                recordsProcessed: result.recordsProcessed || 0,
                storedCount: result.storedCount || 0,
                result: result
            };
        } else {
            logger.error(`❌ AdUnitWise crawler failed: ${result.error}`);
            // Fallback to original method if Python bridge fails
            logger.info('Falling back to original GenerateAdManagerReport method...');
            const fallbackResult = await GenerateAdManagerReport();
            const recordsCount = await models?.AdUnitReport?.countDocuments({ isDeleted: false }) || 0;
            return {
                recordsProcessed: recordsCount,
                result: fallbackResult,
                warning: 'Python bridge failed, used fallback method'
            };
        }
    } catch (error) {
        logger.error(`Error in runAdUnitWiseCrawler: ${error.message}`);
        logger.error(`Stack: ${error.stack}`);
        
        // Fallback to original method on error
        logger.info('Falling back to original GenerateAdManagerReport method due to error...');
        try {
            const fallbackResult = await GenerateAdManagerReport();
            const recordsCount = await models?.AdUnitReport?.countDocuments({ isDeleted: false }) || 0;
            return {
                recordsProcessed: recordsCount,
                result: fallbackResult,
                warning: `Python bridge error: ${error.message}, used fallback method`
            };
        } catch (fallbackError) {
            logger.error(`Fallback method also failed: ${fallbackError.message}`);
            throw fallbackError;
        }
    }
};

export default {
    runCrawler,
    runHourWiseCrawler,
    runMonthToDateCrawler,
    runAdUnitWiseCrawler
};

