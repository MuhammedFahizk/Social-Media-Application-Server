const argon2 = require('argon2');
const Admin = require('../modal/AdminModel');

const adminLoginHelper = (LoginDAta) => new Promise((resolve, reject) => {
  const { email, password } = LoginDAta;

  Admin.findOne({ email })
    .then((admin) => {
      if (!admin) {
        throw new Error('Email or Password is Mismatch');
      }
      return argon2.verify(admin.password, password).then((isPasswordValid) => {
        if (isPasswordValid) {
          resolve(admin);
        } else {
          reject(new Error('Invalid password'));
        }
      });
    })
    .catch((error) => {
      reject(error);
    });
});

module.exports = {
  adminLoginHelper,
};
