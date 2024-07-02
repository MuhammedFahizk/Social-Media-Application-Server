import pkg from 'jsonwebtoken';
import  {generateToken, generateAdminAccessToken}  from './generateTokens.js';
import Admin from '../../model/AdminModel.js';

const { verify } = pkg;

const verifyAdminRefreshToken = (refreshToken) => new Promise((resolve, reject) => {
  Admin.findOne({ token: refreshToken })
    .then((admin) => {
      if (!admin) {
        return reject(new Error('Invalid Refresh token'));
      }
      verify(refreshToken, process.env.REFRESH_TOKEN_PRIVATE_KEY, async (err, tokenDetail) => {
        if (err) {
          return reject(new Error('Invalid Refresh tokens'));
        }
        const { accessToken, refreshToken } = await generateAdminAccessToken(tokenDetail);
        return resolve({ accessToken });
      });
      return true;
    })
    .catch((err) => {
      reject(new Error('Database error', err));
    });
});

export  {verifyAdminRefreshToken};
