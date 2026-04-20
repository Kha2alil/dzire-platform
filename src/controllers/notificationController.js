const notificationRepo = require('../repositories/notificationRepository');

/**
 * GET /api/notifications
 * Fetch paginated notifications for the authenticated user
 */
const getNotifications = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const notifications = await notificationRepo.getByUser(req.user.id, limit, offset);
        res.status(200).json({
            success: true,
            notifications,
            pagination: { limit, offset }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the authenticated user
 */
const getUnreadCount = async (req, res, next) => {
    try {
        const count = await notificationRepo.getUnreadCount(req.user.id);
        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await notificationRepo.markAsRead(id, req.user.id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 */
const markAllAsRead = async (req, res, next) => {
    try {
        await notificationRepo.markAllAsRead(req.user.id);
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};