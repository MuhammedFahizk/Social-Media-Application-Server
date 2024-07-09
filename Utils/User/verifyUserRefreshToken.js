import pkg from 'jsonwebtoken';
import {User} from '../../model/User.js';
// User.js
import {generateUserAccessToken} from './generateUserAccessToken.js';

const { verify } = pkg;

const verifyUserRefreshToken = (refreshToken) => new Promise((resolve, reject) => {
  User.findOne({ token: refreshToken })
    .then((user) => {
      if (!user) {
        console.error('Invalid Refresh token');
        return reject(new Error('Invalid Refresh token'));
      }
      verify(refreshToken, process.env.REFRESH_TOKEN_PRIVATE_KEY, async (err, tokenDetail) => {
        if (err) {
          console.error(err);
          return reject(new Error('Invalid Refresh token'));
        }
        try {
          const { accessToken } = await generateUserAccessToken(tokenDetail);
          return resolve({ accessToken });
        } catch (tokenError) {
          return reject(new Error('Token generation failed', tokenError));
        }
      });
    })
    .catch((err) => {
      console.error('Database error:', err);
      reject(new Error('Database error'));
    });
});

export { verifyUserRefreshToken };
