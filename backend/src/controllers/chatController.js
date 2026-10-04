// Chat controller: handles messaging with AI bot routing based on gender
import { MessageModel, ProfileModel, UserModel, UnlockedPartnerModel } from '../models/index.js';
import { generateBotResponse } from '../services/aiBotService.js';

export const getConversation = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const userId = req.user.id;

        if (!partnerId) {
            return res.status(400).json({ message: 'Partner ID required' });
        }

        // Check if the partner is unlocked
        const isUnlocked = await UnlockedPartnerModel.isUnlocked(userId, parseInt(partnerId));
        if (!isUnlocked) {
            return res.status(403).json({ message: 'Partner not unlocked. Please unlock to start chatting.' });
        }

        // Get user's profile and partner's profile
        const userProfile = await ProfileModel.findByUserId(userId);
        const partnerProfile = await ProfileModel.findById(parseInt(partnerId));

        if (!userProfile || !partnerProfile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Generate conversation_id based on profile IDs
        const convId = `conv_${Math.min(userProfile.id, partnerProfile.id)}_${Math.max(userProfile.id, partnerProfile.id)}`;

        const messages = await MessageModel.getConversation(userProfile.id, partnerProfile.id);

        const formattedMessages = messages.map(m => ({
            id: m.id,
            sender_id: m.sender_id,
            receiver_id: m.receiver_id,
            content: m.content,
            is_bot: !!m.is_bot,
            created_at: m.created_at,
            is_read: !!m.is_read
        }));

        res.json({
            conversation_id: convId,
            partner: {
                id: partnerProfile.id,
                full_name: partnerProfile.full_name || partnerProfile.bot_persona,
                photo_url: partnerProfile.photo_url,
                is_bot: !!partnerProfile.is_bot,
                gender: partnerProfile.gender
            },
            user: {
                id: userProfile.id,
                gender: userProfile.gender
            },
            messages: formattedMessages
        });
    } catch (err) {
        console.error('Get conversation error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Message content required' });
        }

        // Verify partner is unlocked
        const isUnlocked = await UnlockedPartnerModel.isUnlocked(userId, parseInt(partnerId));
        if (!isUnlocked) {
            return res.status(403).json({ message: 'Partner not unlocked' });
        }

        const userProfile = await ProfileModel.findByUserId(userId);
        const partnerProfile = await ProfileModel.findById(parseInt(partnerId));

        if (!userProfile || !partnerProfile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const convId = `conv_${Math.min(userProfile.id, partnerProfile.id)}_${Math.max(userProfile.id, partnerProfile.id)}`;

        // Save user's message (is_bot = 0 since human sent it)
        const userMessage = await MessageModel.create({
            sender_id: userProfile.id,
            receiver_id: partnerProfile.id,
            content: content.trim(),
            is_bot: false,
            conversation_id: convId
        });

        // Count previous messages in conversation for response context
        const prevMessages = await MessageModel.getConversation(userProfile.id, partnerProfile.id);
        const messageCount = prevMessages.length;

        // If partner is a bot, generate AI response
        if (partnerProfile.is_bot) {
            // Gender-swapped routing: user's gender determines bot persona
            // Man -> Female AI (partnerProfile.gender === 'Woman')
            // Woman -> Male AI (partnerProfile.gender === 'Man')
            const botResponse = generateBotResponse(
                content,
                userProfile.gender,
                { full_name: partnerProfile.full_name, bot_persona: partnerProfile.bot_persona },
                messageCount
            );

            // Simulate typing delay
            setTimeout(async () => {
                await MessageModel.create({
                    sender_id: partnerProfile.id,
                    receiver_id: userProfile.id,
                    content: botResponse.content,
                    is_bot: true,
                    conversation_id: convId
                });
            }, botResponse.typingDelay);

            res.json({
                message: {
                    id: userMessage.id,
                    sender_id: userProfile.id,
                    receiver_id: partnerProfile.id,
                    content: content.trim(),
                    is_bot: false,
                    created_at: new Date().toISOString()
                },
                bot_response: {
                    content: botResponse.content,
                    delay: botResponse.typingDelay,
                    persona: botResponse.persona,
                    botName: botResponse.botName
                }
            });
        } else {
            // Real human recipient - no bot response
            res.json({
                message: {
                    id: userMessage.id,
                    sender_id: userProfile.id,
                    receiver_id: partnerProfile.id,
                    content: content.trim(),
                    is_bot: false,
                    created_at: new Date().toISOString()
                },
                bot_response: null
            });
        }
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRecentConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const userProfile = await ProfileModel.findByUserId(userId);

        if (!userProfile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const conversations = await MessageModel.getRecentMessages(userProfile.id);
        res.json({ conversations });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
