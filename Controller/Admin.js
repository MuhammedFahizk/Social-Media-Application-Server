const helper = require("../Helper/admin");
const { generateToken } = require("../Utils/generateTokens");
const { verifyAdminRefreshToken } = require("../Utils/verifyAdminRefreshToken");
// const adminSignUp = async(req,res) => {
//     try{
//         const {name,email,password} = req.body;
//         console.log(name, email, password);
//         helper.signUpAdminHelper({username: name, password, email})
//         .then((result) => {
//             console.log('Admin signed up:' );
//             res.send('ok')
//         })
//         .catch((err) => {
//             console.log('Error while signing up admin:', err);
//             res.status(400).send(err)
//             })

//     }
//     catch (error) {
//         console.log(error);
//         res.status(500).json({ error: 'Server error' });
//     }
// }

const adminLogin = async (req, res) => {
  try {
    // Destructure email and password from request body
    const { email, password } = req.body;

    // Call the helper function with the request body
    const result = await helper.adminLoginHelper(req.body);

    console.log("Admin logged in:");

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateToken(result);

    // Set cookies for access and refresh tokens
    // res.cookie("accessToken", accessToken, { httpOnly: true, secure: true });
    // res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });

    // Send successful login response
    res.status(200).json({
      error: false,
      accessToken,
      refreshToken,
      message: "Admin logged in successfully",
    });
  } catch (err) {
    console.error("Error while logging in admin:", err);

    // Determine the type of error and respond accordingly
    if (err.message === "Invalid credentials") {
      res.status(400).json({ error: true, message: "Invalid credentials" });
    } else {
      res.status(500).json({ error: true, message: err });
    }
  }
};

const generateAccessToken = async (req, res) => {
  try {
    const {refreshToken} = req.body
    console.log("refreshToken: ", refreshToken);
    verifyAdminRefreshToken(refreshToken)
    .then((result) => {
      res.status(200).json(
        {accessToken: result.accessToken, refreshToken: result.refreshToken}
      )
    })
    .catch((err) => {
      console.log(err.message,'error message for generate access token');
      res.status(400).json({error: true, message: err.message})
      })
  } catch (error) {
    res.status(500).json({error: true, message: error.message})
  }
};

module.exports = {
  // adminSignUp
  adminLogin,
  generateAccessToken,
};
