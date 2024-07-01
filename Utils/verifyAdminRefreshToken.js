const Admin = require("../modal/AdminModel");
const jwt = require('jsonwebtoken');
const { generateToken } = require("./generateTokens");
const verifyAdminRefreshToken = (refreshToken) => {
    return new Promise((resolve, reject) => {
        Admin.findOne({ token: refreshToken })
            .then(admin => {
                if (!admin) {
                    return reject({ error: true, message: 'Invalid Refresh token' });
                }
                jwt.verify(refreshToken, process.env.REFRESH_TOKEN_PRIVATE_KEY, async (err, tokenDetail) => {
                    if (err) {
                        return reject({ error: true, message: 'Invalid Refresh tokens' });
                    }
                    // Assuming generateToken is defined somewhere and returns { accessToken, refreshToken }
                    const { accessToken, refreshToken } = await generateToken(tokenDetail);
                    resolve({ accessToken, refreshToken });
                });
            })
            .catch(err => {
                reject({ error: true, message: 'Database error' });
            });
    });
};

module.exports = {
    verifyAdminRefreshToken
};
