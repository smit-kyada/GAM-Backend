import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization.js";
import { FilterQuery } from "../functions/generateFilterQuery.js";
import { ObjectId } from 'mongodb';

export default {
    SiteRequest: {
        reviewedAt: (parent) => {
            if (!parent.reviewedAt) return null;
            
            // Handle different date formats
            let date;
            if (typeof parent.reviewedAt === 'string') {
                // Check if it's an ISO date string
                if (parent.reviewedAt.includes('T') || parent.reviewedAt.includes('-')) {
                    date = new Date(parent.reviewedAt);
                } else {
                    // Try parsing as timestamp
                    const timestamp = parseInt(parent.reviewedAt);
                    if (!isNaN(timestamp) && timestamp > 0) {
                        date = new Date(timestamp);
                    } else {
                        date = new Date(parent.reviewedAt);
                    }
                }
            } else {
                date = new Date(parent.reviewedAt);
            }
            
            if (isNaN(date.getTime())) {
                return parent.reviewedAt; // Return original if invalid
            }
            
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        },
        createdAt: (parent) => {
            if (!parent.createdAt) return null;
            
            let date;
            if (typeof parent.createdAt === 'string') {
                if (parent.createdAt.includes('T') || parent.createdAt.includes('-')) {
                    date = new Date(parent.createdAt);
                } else {
                    const timestamp = parseInt(parent.createdAt);
                    if (!isNaN(timestamp) && timestamp > 0) {
                        date = new Date(timestamp);
                    } else {
                        date = new Date(parent.createdAt);
                    }
                }
            } else {
                date = new Date(parent.createdAt);
            }
            
            if (isNaN(date.getTime())) {
                return parent.createdAt;
            }
            
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        },
        updatedAt: (parent) => {
            if (!parent.updatedAt) return null;
            
            let date;
            if (typeof parent.updatedAt === 'string') {
                if (parent.updatedAt.includes('T') || parent.updatedAt.includes('-')) {
                    date = new Date(parent.updatedAt);
                } else {
                    const timestamp = parseInt(parent.updatedAt);
                    if (!isNaN(timestamp) && timestamp > 0) {
                        date = new Date(timestamp);
                    } else {
                        date = new Date(parent.updatedAt);
                    }
                }
            } else {
                date = new Date(parent.updatedAt);
            }
            
            if (isNaN(date.getTime())) {
                return parent.updatedAt;
            }
            
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        }
    },

    Query: {
        getSiteRequests: combineResolvers(isAdmin, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    let Obj = {};
                    Obj.isDeleted = false;

                    if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                        const filterText = FilterQuery(args?.search, 'siteRequestTbl');
                        Obj.$and = [filterText];
                    }

                    if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {
                        const filterData = JSON.parse(args?.filter);
                        if (filterData?.status) {
                            Obj.status = filterData?.status;
                        }
                        if (filterData?.userId) {
                            Obj.userId = ObjectId(filterData?.userId);
                        }
                    }

                    await models?.SiteRequest.paginate(Obj, {
                        page: args?.page || 1,
                        limit: args?.limit || 10,
                        sort: { _id: "-1" },
                        populate: [
                            { path: 'userId', select: 'userName email fName lName companyName' },
                            { path: 'siteId', select: 'site description' },
                            { path: 'reviewedBy', select: 'userName email fName lName' }
                        ]
                    })
                        .then((result) => {
                            resolve({
                                count: result?.total || 0,
                                data: result?.docs || []
                            });
                        })
                        .catch((error) => reject(error));
                } catch (error) {
                    reject(error);
                }
            });
        }),

        getMySiteRequests: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    let Obj = {};
                    Obj.userId = ObjectId(me?.id);
                    Obj.isDeleted = false;

                    if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                        const filterText = FilterQuery(args?.search, 'siteRequestTbl');
                        Obj.$and = [filterText];
                    }

                    if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {
                        const filterData = JSON.parse(args?.filter);
                        if (filterData?.status) {
                            Obj.status = filterData?.status;
                        }
                    }

                    await models?.SiteRequest.paginate(Obj, {
                        page: args?.page || 1,
                        limit: args?.limit || 10,
                        sort: { _id: "-1" },
                        populate: [
                            { path: 'siteId', select: 'site description' },
                            { path: 'reviewedBy', select: 'userName email fName lName' }
                        ]
                    })
                        .then((result) => {
                            resolve({
                                count: result?.total || 0,
                                data: result?.docs || []
                            });
                        })
                        .catch((error) => reject(error));
                } catch (error) {
                    reject(error);
                }
            });
        }),

        getSiteRequest: combineResolvers(isAuthenticated, (parent, { id }, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const siteRequest = await models?.SiteRequest.findOne({
                        _id: id,
                        isDeleted: false
                    })
                        .populate('userId', 'userName email fName lName companyName')
                        .populate('siteId', 'site description')
                        .populate('reviewedBy', 'userName email fName lName');

                    if (!siteRequest) {
                        reject("Site request not found");
                        return;
                    }

                    // Check if user can access this request
                    if (!me?.isAdmin && siteRequest.userId._id.toString() !== me?.id) {
                        reject("Access denied");
                        return;
                    }

                    resolve(siteRequest);
                } catch (error) {
                    reject(error);
                }
            });
        })
    },

    Mutation: {
        createSiteRequest: combineResolvers(isAuthenticated, (parent, { input }, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const { requestedSite, requestedDescription, requestMessage } = input;

                    if (!requestedSite) {
                        reject("Site URL is required");
                        return;
                    }

                    // Check if site already exists in the system
                    const existingSite = await models?.Site.findOne({
                        site: requestedSite,
                        isDeleted: false
                    });

                    if (existingSite) {
                        // Site exists - check if user already has access
                        if (existingSite.userId && existingSite.userId.toString() === me?.id) {
                            reject("You already have access to this site");
                            return;
                        }

                        // Check if user already has a pending request for this site
                        const existingRequest = await models?.SiteRequest.findOne({
                            userId: ObjectId(me?.id),
                            siteId: ObjectId(existingSite._id),
                            status: 'pending',
                            isDeleted: false
                        });

                        if (existingRequest) {
                            reject("You already have a pending request for this site");
                            return;
                        }

                        // Create request for existing site
                        const siteRequest = await models?.SiteRequest.create({
                            userId: ObjectId(me?.id),
                            siteId: ObjectId(existingSite._id),
                            requestedSite: requestedSite,
                            requestedDescription: requestedDescription || '',
                            requestMessage: requestMessage || '',
                            status: 'pending'
                        });

                        // Populate the response
                        const populatedRequest = await models?.SiteRequest.findById(siteRequest._id)
                            .populate('userId', 'userName email fName lName companyName')
                            .populate('siteId', 'site description');

                        resolve(populatedRequest);

                    } else {
                        // Site doesn't exist - check if user already has a pending request for this new site
                        const existingRequest = await models?.SiteRequest.findOne({
                            userId: ObjectId(me?.id),
                            requestedSite: requestedSite,
                            siteId: { $exists: false }, // No siteId means it's a new site request
                            status: 'pending',
                            isDeleted: false
                        });

                        if (existingRequest) {
                            reject("You already have a pending request for this site");
                            return;
                        }

                        // Create request for new site
                        const siteRequest = await models?.SiteRequest.create({
                            userId: ObjectId(me?.id),
                            requestedSite: requestedSite,
                            requestedDescription: requestedDescription || '',
                            requestMessage: requestMessage || '',
                            status: 'pending'
                        });

                        // Populate the response
                        const populatedRequest = await models?.SiteRequest.findById(siteRequest._id)
                            .populate('userId', 'userName email fName lName companyName');

                        resolve(populatedRequest);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }),

        reviewSiteRequest: combineResolvers(isAdmin, (parent, { input }, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const { id, status, adminResponse } = input;

                    // Validate status
                    if (!['approved', 'rejected'].includes(status)) {
                        reject("Invalid status. Must be 'approved' or 'rejected'");
                        return;
                    }

                    // Find the site request
                    const siteRequest = await models?.SiteRequest.findOne({
                        _id: id,
                        isDeleted: false,
                        status: 'pending'
                    });

                    if (!siteRequest) {
                        reject("Site request not found or already processed");
                        return;
                    }

                    let updatedRequest;

                    if (status === 'approved') {
                        if (siteRequest.siteId) {
                            // Handle existing site approval
                            await models?.Site.findOneAndUpdate(
                                { _id: siteRequest.siteId },
                                { userId: siteRequest.userId }
                            );

                            // Update the site request
                            updatedRequest = await models?.SiteRequest.findOneAndUpdate(
                                { _id: id },
                                {
                                    status,
                                    adminResponse: adminResponse || '',
                                    reviewedBy: ObjectId(me?.id),
                                    reviewedAt: new Date()
                                },
                                { new: true }
                            )
                                .populate('userId', 'userName email fName lName companyName')
                                .populate('siteId', 'site description')
                                .populate('reviewedBy', 'userName email fName lName');

                        } else {
                            // Handle new site approval - create the site
                            // Generate a secure default password
                            const defaultPassword = 'TempPass123!'; // Secure default password
                            const newSite = await models?.Site.create({
                                site: siteRequest.requestedSite,
                                description: siteRequest.requestedDescription,
                                userId: siteRequest.userId,
                                password: defaultPassword,
                                isActive: false // Default to inactive for client-requested sites
                            });

                            // Update the site request with created site ID
                            updatedRequest = await models?.SiteRequest.findOneAndUpdate(
                                { _id: id },
                                {
                                    status,
                                    adminResponse: adminResponse || '',
                                    reviewedBy: ObjectId(me?.id),
                                    reviewedAt: new Date(),
                                    createdSiteId: newSite._id
                                },
                                { new: true }
                            )
                                .populate('userId', 'userName email fName lName companyName')
                                .populate('createdSiteId', 'site description')
                                .populate('reviewedBy', 'userName email fName lName');
                        }
                    } else {
                        // Handle rejection
                        updatedRequest = await models?.SiteRequest.findOneAndUpdate(
                            { _id: id },
                            {
                                status,
                                adminResponse: adminResponse || '',
                                reviewedBy: ObjectId(me?.id),
                                reviewedAt: new Date()
                            },
                            { new: true }
                        )
                            .populate('userId', 'userName email fName lName companyName')
                            .populate('siteId', 'site description')
                            .populate('createdSiteId', 'site description')
                            .populate('reviewedBy', 'userName email fName lName');
                    }

                    resolve(updatedRequest);
                } catch (error) {
                    reject(error);
                }
            });
        }),

        deleteSiteRequest: combineResolvers(isAuthenticated, (parent, { id }, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const siteRequest = await models?.SiteRequest.findOne({
                        _id: id,
                        isDeleted: false
                    });

                    if (!siteRequest) {
                        reject("Site request not found");
                        return;
                    }

                    // Check if user can delete this request (only if they created it or if admin)
                    if (!me?.isAdmin && siteRequest.userId.toString() !== me?.id) {
                        reject("Access denied");
                        return;
                    }

                    // Only allow deletion of pending requests
                    if (siteRequest.status !== 'pending') {
                        reject("Can only delete pending requests");
                        return;
                    }

                    await models?.SiteRequest.findOneAndUpdate(
                        { _id: id },
                        { isDeleted: true },
                        { new: true }
                    );

                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            });
        })
    }
};
