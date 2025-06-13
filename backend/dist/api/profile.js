"use strict";
'POST';
try {
    const profileData = req.body;
    // Check for existing profile by email
    const existing = await prisma.userProfile.findUnique({ where: { email: profileData.email } });
    if (existing) {
        return res.status(409).json({ message: 'Profile already exists' });
    }
    const profile = await prisma.userProfile.create({
        data: {
            email: userEmail,
            name: profileData.name,
            avatar: profileData.avatar,
            height: profileData.height,
            weight: profileData.weight,
            age: profileData.age,
            gender: profileData.gender,
            fitnessGoals: profileData.fitnessGoals,
            activityLevel: profileData.activityLevel,
            dietaryPreferences: profileData.dietaryPreferences,
            emailNotifications: profileData.notifications.email,
            telegramEnabled: profileData.notifications.telegram,
            telegramChatId: profileData.notifications.telegramChatId
        }
    });
    return res.status(201).json({
        ...profileData,
        id: profile.id,
        email: profile.email
    });
}
catch (error) {
    console.error('Error creating profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
}
