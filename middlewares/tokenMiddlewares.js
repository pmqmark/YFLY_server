const jwt = require("jsonwebtoken");

const expiryAccessToken = "9h";
const expiryRefreshToken = "7d";


//Create Access Token;
const generateAccessToken = (userInfo) => {
    return jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: expiryAccessToken })
}

//Create Refresh Token;
const generateRefreshToken = (userInfo) => {
    return jwt.sign(userInfo, process.env.REFRESH_TOKEN_SECRET, { expiresIn: expiryRefreshToken })
}

module.exports = {expiryAccessToken,expiryRefreshToken, generateAccessToken, generateRefreshToken}