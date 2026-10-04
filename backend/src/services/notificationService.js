// Notification service: generates interest notifications for dashboard popups
import { NotificationModel, ProfileModel, UserModel } from '../models/index.js';

// Trigger interest notifications for a user logging into their dashboard
export const triggerInterestNotifications = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) return [];

    const userProfiles = await ProfileModel.findByUserId(userId);
    const gender = userProfiles?.gender || 'Man';
    const oppositeGender = gender === 'Man' ? 'Woman' : 'Man';

    // Find 3-5 profiles of opposite gender as interested parties
    const interestedProfiles = await ProfileModel.findByGenderAndTier(oppositeGender, 5);

    if (interestedProfiles.length === 0) return [];

    // Select 3 random profiles as "interested"
    const selected = shuffleArray(interestedProfiles).slice(0, 3);

    const notifications = [];
    const messages = [
        'Someone viewed your profile',
        'is interested in getting to know you',
        'liked your profile photo',
        'wants to chat with you',
        'is looking at your profile right now'
    ];

    for (const profile of selected) {
        const message = `${profile.full_name || 'A premium member'} ${messages[Math.floor(Math.random() * messages.length)]}`;
        const notification = await NotificationModel.create({
            user_id: userId,
            profile_id: profile.id,
            message,
            type: 'interest'
        });
        notifications.push(notification);
    }

    return notifications;
};

// Get unread notifications for a user
export const getUnreadNotifications = async (userId) => {
    return await NotificationModel.getUnreadByUserId(userId);
};

// Mark all notifications as read
export const markNotificationsRead = async (userId) => {
    return await NotificationModel.markAllRead(userId);
};

const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
