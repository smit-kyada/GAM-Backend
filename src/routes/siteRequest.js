import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sendResponse } from '../functions/sendResponse.js';
import models from '../models/index.js';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        return sendResponse(res, 403, false, "Access denied. Admin privileges required.", null);
    }
};

// Get available sites for request
router.get('/available-sites', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get sites that are not assigned to any user and are not already requested by current user
        const userPendingRequests = await models.SiteRequest.find({
            userId: userId,
            status: 'pending',
            isDeleted: false
        }).select('siteId');

        const pendingSiteIds = userPendingRequests.map(req => req.siteId);

        const availableSites = await models.Site.find({
            $and: [
                { userId: { $exists: false } },
                { isDeleted: false },
                { _id: { $nin: pendingSiteIds } }
            ]
        }).sort({ _id: -1 });

        return sendResponse(res, 200, true, "Available sites retrieved successfully", availableSites);
    } catch (error) {
        console.error('Error fetching available sites:', error);
        return sendResponse(res, 500, false, "Internal server error", null);
    }
});

// Create site request
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { requestedSite, requestedDescription, requestMessage } = req.body;
        const userId = req.user.id;

        if (!requestedSite) {
            return sendResponse(res, 400, false, "Site URL is required", null);
        }

        // Check if site already exists in the system
        const existingSite = await models.Site.findOne({
            site: requestedSite,
            isDeleted: false
        });

        if (existingSite) {
            // Site exists - check if user already has access
            if (existingSite.userId && existingSite.userId.toString() === userId) {
                return sendResponse(res, 400, false, "You already have access to this site", null);
            }

            // Check if user already has a pending request for this site
            const existingRequest = await models.SiteRequest.findOne({
                userId: userId,
                siteId: existingSite._id,
                status: 'pending',
                isDeleted: false
            });

            if (existingRequest) {
                return sendResponse(res, 400, false, "You already have a pending request for this site", null);
            }

            // Create request for existing site
            const siteRequest = await models.SiteRequest.create({
                userId: userId,
                siteId: existingSite._id,
                requestedSite: requestedSite,
                requestedDescription: requestedDescription || '',
                requestMessage: requestMessage || '',
                status: 'pending'
            });

            // Populate the response
            const populatedRequest = await models.SiteRequest.findById(siteRequest._id)
                .populate('userId', 'userName email fName lName companyName')
                .populate('siteId', 'site description');

            return sendResponse(res, 201, true, "Site request created successfully", populatedRequest);

        } else {
            // Site doesn't exist - check if user already has a pending request for this new site
            const existingRequest = await models.SiteRequest.findOne({
                userId: userId,
                requestedSite: requestedSite,
                siteId: { $exists: false }, // No siteId means it's a new site request
                status: 'pending',
                isDeleted: false
            });

            if (existingRequest) {
                return sendResponse(res, 400, false, "You already have a pending request for this site", null);
            }

            // Create request for new site
            const siteRequest = await models.SiteRequest.create({
                userId: userId,
                requestedSite: requestedSite,
                requestedDescription: requestedDescription || '',
                requestMessage: requestMessage || '',
                status: 'pending'
            });

            // Populate the response
            const populatedRequest = await models.SiteRequest.findById(siteRequest._id)
                .populate('userId', 'userName email fName lName companyName');

            return sendResponse(res, 201, true, "New site request created successfully", populatedRequest);
        }
    } catch (error) {
        console.error('Error creating site request:', error);
        return sendResponse(res, 500, false, "Internal server error", null);
    }
});

// Get all site requests (Admin only)
router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const userId = req.query.userId || '';

        let query = { isDeleted: false };

        // Add search filter
        if (search) {
            query.$or = [
                { requestMessage: { $regex: search, $options: 'i' } },
                { adminResponse: { $regex: search, $options: 'i' } }
            ];
        }

        // Add status filter
        if (status) {
            query.status = status;
        }

        // Add user filter
        if (userId) {
            query.userId = userId;
        }

        const siteRequests = await models.SiteRequest.paginate(query, {
            page,
            limit,
            sort: { _id: -1 },
            populate: [
                { path: 'userId', select: 'userName email fName lName companyName' },
                { path: 'siteId', select: 'site description' },
                { path: 'reviewedBy', select: 'userName email fName lName' }
            ]
        });

        return sendResponse(res, 200, true, "Site requests retrieved successfully", {
            count: siteRequests.total,
            data: siteRequests.docs
        });
    } catch (error) {
        console.error('Error fetching site requests:', error);
        return sendResponse(res, 500, false, "Internal server error", null);
    }
});

// Get my site requests
router.get('/my-requests', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const userId = req.user.id;

        let query = { userId: userId, isDeleted: false };

        // Add search filter
        if (search) {
            query.$or = [
                { requestMessage: { $regex: search, $options: 'i' } },
                { adminResponse: { $regex: search, $options: 'i' } }
            ];
        }

        // Add status filter
        if (status) {
            query.status = status;
        }

        const siteRequests = await models.SiteRequest.paginate(query, {
            page,
            limit,
            sort: { _id: -1 },
            populate: [
                { path: 'siteId', select: 'site description' },
                { path: 'reviewedBy', select: 'userName email fName lName' }
            ]
        });

        return sendResponse(res, 200, true, "Your site requests retrieved successfully", {
            count: siteRequests.total,
            data: siteRequests.docs
        });
    } catch (error) {
        console.error('Error fetching user site requests:', error);
        return sendResponse(res, 500, false, "Internal server error", null);
    }
});

// Get single site request
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const siteRequest = await models.SiteRequest.findOne({
            _id: id,
            isDeleted: false
        })
            .populate('userId', 'userName email fName lName companyName')
            .populate('siteId', 'site description')
            .populate('reviewedBy', 'userName email fName lName');

        if (!siteRequest) {
            return sendResponse(res, 404, false, "Site request not found", null);
        }

        // Check if user can access this request
        if (!req.user.isAdmin && siteRequest.userId._id.toString() !== userId) {
            return sendResponse(res, 403, false, "Access denied", null);
        }

        return sendResponse(res, 200, true, "Site request retrieved successfully", siteRequest);
    } catch (error) {
        console.error('Error fetching site request:', error);
        return sendResponse(res, 500, false, "Internal server error", null);
    }
});

// Review site request (Admin only)
router.put('/review', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id, status, adminResponse } = req.body;
        const adminId = req.user.id;

        if (!id || !status) {
            return sendResponse(res, 400, false, "Request ID and status are required", null);
        }

        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return sendResponse(res, 400, false, "Invalid status. Must be 'approved' or 'rejected'", null);
        }

        // Find the site request
        const siteRequest = await models.SiteRequest.findOne({
            _id: id,
            isDeleted: false,
            status: 'pending'
        });

        if (!siteRequest) {
            return sendResponse(res, 404, false, "Site request not found or already processed", null);
        }

        let updatedRequest;

        if (status === 'approved') {
            if (siteRequest.siteId) {
                // Handle existing site approval
                await models.Site.findOneAndUpdate(
                    { _id: siteRequest.siteId },
                    { userId: siteRequest.userId }
                );

                // Update the site request
                updatedRequest = await models.SiteRequest.findOneAndUpdate(
                    { _id: id },
                    {
                        status,
                        adminResponse: adminResponse || '',
                        reviewedBy: adminId,
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
                const newSite = await models.Site.create({
                    site: siteRequest.requestedSite,
                    description: siteRequest.requestedDescription,
                    userId: siteRequest.userId,
                    password: defaultPassword,
                    isActive: false // Default to inactive for client-requested sites
                });

                // Update the site request with created site ID
                updatedRequest = await models.SiteRequest.findOneAndUpdate(
                    { _id: id },
                    {
                        status,
                        adminResponse: adminResponse || '',
                        reviewedBy: adminId,
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
            updatedRequest = await models.SiteRequest.findOneAndUpdate(
                { _id: id },
                {
                    status,
                    adminResponse: adminResponse || '',
                    reviewedBy: adminId,
                    reviewedAt: new Date()
                },
                { new: true }
            )
                .populate('userId', 'userName email fName lName companyName')
                .populate('siteId', 'site description')
                .populate('createdSiteId', 'site description')
                .populate('reviewedBy', 'userName email fName lName');
        }

        return sendResponse(res, 200, true, "Site request reviewed successfully", updatedRequest);
    } catch (error) {
        console.error('Error reviewing site request:', error);
        return sendResponse(res, 500, false, "Internal server error", null);
    }
});

// Delete site request
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const siteRequest = await models.SiteRequest.findOne({
            _id: id,
            isDeleted: false
        });

        if (!siteRequest) {
            return sendResponse(res, 404, false, "Site request not found", null);
        }

        // Check if user can delete this request (only if they created it or if admin)
        if (!req.user.isAdmin && siteRequest.userId.toString() !== userId) {
            return sendResponse(res, 403, false, "Access denied", null);
        }

        // Only allow deletion of pending requests
        if (siteRequest.status !== 'pending') {
            return sendResponse(res, 400, false, "Can only delete pending requests", null);
        }

        await models.SiteRequest.findOneAndUpdate(
            { _id: id },
            { isDeleted: true },
            { new: true }
        );

        return sendResponse(res, 200, true, "Site request deleted successfully", null);
    } catch (error) {
        console.error('Error deleting site request:', error);
        return sendResponse(res, 500, false, "Internal server error", null);
    }
});

export default router;
