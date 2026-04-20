const db = require('../config/database');

/**
 * Create a new notification
 * @param {Object} notification - { user_id, type, title, message, link }
 * @returns {Promise<string>} - UUID of the created notification
 */
const create = async (notification) => {
    const query = `
        INSERT INTO notifications (id, user_id, type, title, message, link)
        VALUES (UUID(), ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.link || null
    ]);
    return result.insertId; // Note: insertId is not the UUID; we'll return the UUID later if needed
    // Alternatively, you can SELECT the UUID after insert. For simplicity, return true.
};

/**
 * Get unread count for a user
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>}
 */
const getUnreadCount = async (userId) => {
    const [rows] = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
        [userId]
    );
    return rows[0].count;
};

/**
 * Get notifications for a user (paginated, newest first)
 * @param {string} userId - UUID of the user
 * @param {number} limit - Max number of records
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>}
 */
const getByUser = async (userId, limit = 20, offset = 0) => {
    const [rows] = await db.query(
        `SELECT id, type, title, message, link, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
    return rows;
};

/**
 * Mark a single notification as read
 * @param {string} notificationId - UUID of the notification
 * @param {string} userId - UUID of the user (to ensure ownership)
 * @returns {Promise<boolean>}
 */
const markAsRead = async (notificationId, userId) => {
    const [result] = await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [notificationId, userId]
    );
    return result.affectedRows > 0;
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - UUID of the user
 * @returns {Promise<void>}
 */
const markAllAsRead = async (userId) => {
    await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [userId]
    );
};

/**
 * Delete old notifications (optional cleanup)
 * @param {Date} olderThan - Delete notifications created before this date
 * @returns {Promise<number>} - Number of deleted rows
 */
const deleteOldNotifications = async (olderThan) => {
    const [result] = await db.query(
        'DELETE FROM notifications WHERE created_at < ?',
        [olderThan]
    );
    return result.affectedRows;
};

module.exports = {
    create,
    getUnreadCount,
    getByUser,
    markAsRead,
    markAllAsRead,
    deleteOldNotifications
};