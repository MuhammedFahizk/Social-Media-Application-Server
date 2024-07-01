const Admin = require("../modal/AdminModel");
const argon2 = require("argon2");

const adminLoginHelper = async (LoginDAta) => {
  return new Promise(async (resolve, reject) => {
    try {
        const { email, password } = LoginDAta;
        const admin = await Admin.findOne({ email });
        if (!admin) {
            reject("Email or Password is Mismatch");
            }
            const isPasswordValid = await argon2.verify(admin.password, password);
            if (isPasswordValid) {
                resolve(admin);
                } else {
                    reject("Invalid password");
                    }

    } catch (error) {
      reject(error);
    }
  });
};
module.exports = {
  adminLoginHelper,
};
