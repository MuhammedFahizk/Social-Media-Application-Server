import pkg from 'jsonwebtoken';

const { sign } = pkg;
 
const generateUserAccessToken = async (user) => {
  try {
    const payload = { _id: user._id };
  
    // Verify environment variables
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error('Missing environment variables');
    }
    const isAdmin = false; // or true, depending on your use case
    const accessToken = sign({ ...payload, isAdmin }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '1m',
    });

    return { newAccessToken: accessToken };
  } catch (err) {
    console.error('Error generating access token:', err);
    throw new Error('Token generation failed');
  }
};

export { generateUserAccessToken };
