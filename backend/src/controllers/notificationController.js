// Notification controller: handles interest notifications for dashboard
import { triggerInterestNotifications as triggerNotifications, getUnreadNotifications as getUnread, markNotificationsRead as markRead } from '../services/notificationService.js';

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        // Trigger interest notifications (simulates real-time notification on login)
        const triggered = await triggerNotifications(userId);

        if (triggered.length > 0) {
            const unread = await getUnread(userId);
            return res.json({
                notifications: unread,
                new_notifications: triggered.length,
                message: 'New interest notifications received'
            });
        }

        // Return existing unread notifications
        const unread = await getUnread(userId);
        res.json({
            notifications: unread,
            new_notifications: 0,
            message: 'Notifications retrieved'
        });
    } catch (err) {
        console.error('Notifications error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await markRead(userId);
        res.json({ message: 'Notifications marked as read', count });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const triggerInterest = async (req, res) => {
    try {
        const userId = req.user.id;
        const triggered = await triggerNotifications(userId);
        res.json({
            notifications: triggered,
            new_notifications: triggered.length,
            message: 'Interest notifications triggered'
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
