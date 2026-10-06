// Profile controller: handles onboarding, profile setup, and retrieval
import { ProfileModel, UserModel } from '../models/index.js';

export   const createProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gender, age, bio, location, interests, photo_url } = req.body;

        if (!gender || !age) {
            return res.status(400).json({ message: 'Gender and age are required' });
        }

        if (gender !== 'Man' && gender !== 'Woman') {
            return res.status(400).json({ message: 'Gender must be Man or Woman' });
        }

        const existing = await ProfileModel.findByUserId(userId);
        if (existing) {
            return res.status(400).json({ message: 'Profile already exists' });
        }

        // Fetch user's full_name from users table
        const user = await UserModel.findById(userId);

        const profile = await ProfileModel.create({
            user_id: userId,
            full_name: user?.full_name,
            gender,
            age: parseInt(age),
            bio: bio || '',
            location: location || '',
            interests: interests || [],
            photo_url: photo_url || null
        });

        res.status(201).json({ profile, message: 'Profile created successfully' });
    } catch (err) {
        console.error('Profile creation error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await ProfileModel.findByUserId(userId);

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const user = await UserModel.findById(userId);

        res.json({
            profile: {
                ...profile,
                interests: profile.interests ? JSON.parse(profile.interests) : [],
                user: { id: user.id, email: user.email, full_name: user.full_name }
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bio, location, interests, photo_url } = req.body;

        const profile = await ProfileModel.findByUserId(userId);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Build through the model layer rather than holding a raw connection,
        // which previously closed the shared handle out from under other queries.
        const patch = {};
        if (bio !== undefined) patch.bio = bio;
        if (location !== undefined) patch.location = location;
        if (interests !== undefined) patch.interests = interests;
        if (photo_url !== undefined) patch.photo_url = photo_url;

        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const result = await ProfileModel.updateFields(userId, patch);
        if (!result.success) {
            return res.status(500).json({ message: 'Update failed' });
        }

        const updated = await ProfileModel.findByUserId(userId);
        res.json({
            message: 'Profile updated successfully',
            profile: { ...updated, interests: updated.interests ? JSON.parse(updated.interests) : [] }
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDashboardMatches = async (req, res) => {
    try {
        const userId = req.user.id;
        const userProfiles = await ProfileModel.findByUserId(userId);
        const gender = userProfiles?.gender || 'Man';
        const targetGender = gender === 'Man' ? 'Woman' : 'Man';

        const matches = await ProfileModel.findByGenderAndTier(targetGender, 12);

        const formattedMatches = matches.map(p => ({
            id: p.id,
            full_name: p.full_name || p.bot_persona,
            age: p.age,
            bio: p.bio,
            location: p.location,
            interests: p.interests ? JSON.parse(p.interests) : [],
            photo_url: p.photo_url,
            tier: p.tier,
            is_bot: !!p.is_bot
        }));

        res.json({ matches: formattedMatches });
    } catch (err) {
        console.error('Dashboard matches error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
