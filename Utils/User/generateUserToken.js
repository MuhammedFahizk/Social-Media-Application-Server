import pkg from 'jsonwebtoken';
import User from '../../model/User.js';

const { sign } = pkg;

 export const generateUserToken = async (user) => {
    try {
        const payload = { _id: user._id };
        console.log(payload);
        console.log('Access Token Secret:', process.env.ACCESS_TOKEN_SECRET);
        console.log('Refresh Token Secret:', process.env.REFRESH_TOKEN_PRIVATE_KEY);

        // Verify environment variables
        if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_PRIVATE_KEY) {
            throw new Error('Missing environment variables');
        }
        const isAdmin = false; // or true, depending on your use case

        const accessToken = sign({ ...payload, isAdmin }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '1m',
        });
        const refreshToken = sign({ ...payload, isAdmin }, process.env.REFRESH_TOKEN_PRIVATE_KEY, {
            expiresIn: '14d',
        });

        await User.updateOne(
            { _id: user._id },
            { $set: { token: refreshToken } }
        );

        return { accessToken, refreshToken };
    } catch (err) {
        console.error('Error generating tokens:', err);
        throw new Error('Token generation failed');
    }
};


