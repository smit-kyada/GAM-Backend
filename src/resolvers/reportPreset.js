import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated } from "./authorization.js";

export default {
    Query: {
        getReportPresets: combineResolvers(isAuthenticated, (parent, args, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const presets = await models?.ReportPreset.find({ 
                        userId: me.id, 
                        isDeleted: false 
                    })
                    .sort({ order: 1 })
                    .populate("userId");
                    
                    resolve(presets || []);
                } catch (error) {
                    reject(error);
                }
            });
        })
    },

    Mutation: {
        saveReportPresets: combineResolvers(isAuthenticated, (parent, { reports }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const userId = me.id;
                    const savedPresets = [];

                    if (!reports || reports.length === 0) {
                        resolve([]);
                        return;
                    }

                    // Get all existing report IDs for this user (including deleted ones)
                    const existingReports = await models?.ReportPreset.find({
                        userId
                    }).select('reportId');

                    const existingReportIds = new Set(existingReports.map(r => r.reportId));

                    // Mark reports that are no longer in the list as deleted
                    const newReportIds = new Set(reports.map(r => r.reportId));
                    const reportsToDelete = Array.from(existingReportIds).filter(id => !newReportIds.has(id));
                    
                    if (reportsToDelete.length > 0) {
                        await models?.ReportPreset.updateMany(
                            { userId, reportId: { $in: reportsToDelete } },
                            { isDeleted: true }
                        );
                    }

                    // Upsert each report (update if exists, create if not)
                    // Use findOneAndUpdate with upsert to handle both cases atomically
                    for (const report of reports) {
                        try {
                            if (!report.reportId) {
                                console.error('Report missing reportId:', report);
                                continue; // Skip reports without reportId
                            }

                            // Ensure presets object has all required fields
                            const presetsData = {
                                breakdowns: report.presets?.breakdowns || [],
                                sites: report.presets?.sites || [],
                                countries: report.presets?.countries || [],
                                adUnits: report.presets?.adUnits || []
                            };


                            // Use findOneAndUpdate with upsert - this is atomic and handles both cases
                            // Query by userId and reportId (not isDeleted) to find existing documents
                            const preset = await models?.ReportPreset.findOneAndUpdate(
                                { userId, reportId: report.reportId },
                                {
                                    $set: {
                                        title: report.title || 'Untitled Report',
                                        description: report.description || 'New report',
                                        icon: report.icon || 'lightning',
                                        isUnsaved: report.isUnsaved || false,
                                        isUserCreated: report.isUserCreated || false,
                                        presets: presetsData,
                                        order: report.order || 0,
                                        userId,
                                        isDeleted: false,
                                        updatedAt: new Date()
                                    },
                                    $setOnInsert: {
                                        createdAt: new Date()
                                    }
                                },
                                {
                                    new: true,
                                    upsert: true,
                                    runValidators: true
                                }
                            );
                            savedPresets.push(preset);
                        } catch (error) {
                            console.error('Error saving report:', report.reportId, error);
                            // If duplicate key error occurs (race condition), find and update using _id
                            if (error.code === 11000 || (error.name && error.name.includes('Mongo'))) {
                                try {
                                    // Document was created between our check and upsert - find and update it
                                    const existingPreset = await models?.ReportPreset.findOne({
                                        userId,
                                        reportId: report.reportId
                                    });
                                    
                                    if (existingPreset) {
                                        // Update using _id to avoid unique index conflict
                                        const preset = await models?.ReportPreset.findByIdAndUpdate(
                                            existingPreset._id,
                                            {
                                                $set: {
                                                    title: report.title,
                                                    description: report.description,
                                                    icon: report.icon || 'lightning',
                                                    isUnsaved: report.isUnsaved || false,
                                                    isUserCreated: report.isUserCreated || false,
                                                    presets: report.presets || {
                                                        breakdowns: [],
                                                        sites: [],
                                                        countries: [],
                                                        adUnits: []
                                                    },
                                                    order: report.order || 0,
                                                    userId,
                                                    isDeleted: false,
                                                    updatedAt: new Date()
                                                }
                                            },
                                            { 
                                                new: true,
                                                runValidators: true
                                            }
                                        );
                                        savedPresets.push(preset);
                                        console.log('Successfully saved report after retry:', report.reportId);
                                    } else {
                                        console.error('Duplicate key error but document not found after retry:', report.reportId);
                                        // This shouldn't happen, but log it
                                    }
                                } catch (retryError) {
                                    console.error('Error in retry for report:', report.reportId, retryError);
                                    // Continue with other reports even if this one fails
                                }
                            } else {
                                // For other errors, log but don't stop the entire save operation
                                console.error('Non-duplicate error saving report:', report.reportId, error.message || error);
                            }
                        }
                    }

                    // Populate userId for all saved presets
                    const populatedPresets = await models?.ReportPreset.find({
                        _id: { $in: savedPresets.map(p => p._id) },
                        isDeleted: false
                    }).populate("userId").sort({ order: 1 });

                    resolve(populatedPresets || savedPresets);
                } catch (error) {
                    reject(error);
                }
            });
        }),

        updateReportPreset: combineResolvers(isAuthenticated, (parent, { reportId, presets }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const userId = me.id;
                    
                    const updatedPreset = await models?.ReportPreset.findOneAndUpdate(
                        { reportId, userId, isDeleted: false },
                        { 
                            $set: { 
                                presets,
                                updatedAt: new Date()
                            }
                        },
                        { new: true, upsert: false }
                    ).populate("userId");

                    if (!updatedPreset) {
                        reject(new Error('Report preset not found'));
                        return;
                    }

                    resolve(updatedPreset);
                } catch (error) {
                    reject(error);
                }
            });
        }),

        deleteReportPreset: combineResolvers(isAuthenticated, (parent, { reportId }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const userId = me.id;
                    
                    // Find and soft-delete the report preset
                    const deletedPreset = await models?.ReportPreset.findOneAndUpdate(
                        { reportId, userId, isDeleted: false },
                        { $set: { isDeleted: true, updatedAt: new Date() } },
                        { new: true }
                    ).populate("userId");

                    if (!deletedPreset) {
                        reject(new Error('Report preset not found'));
                        return;
                    }
                    resolve(deletedPreset);
                } catch (error) {
                    console.error('Error deleting report preset:', error);
                    reject(error);
                }
            });
        })
    }
};

