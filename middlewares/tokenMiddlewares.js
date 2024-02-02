const jwt = require("jsonwebtoken");

const expiryAccessToken = "1h";
const expiryRefreshToken = "30d";


const maxAgeAccessCookie = 1000 * 60 * 60;
const maxAgeRefreshCookie = 1000 * 60 * 60 * 24 * 30;


//Create Access Token;
const generateAccessToken = (userInfo) => {
    return jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: expiryAccessToken })
}

//Create Refresh Token;
const generateRefreshToken = (userInfo) => {
    return jwt.sign(userInfo, process.env.REFRESH_TOKEN_SECRET, { expiresIn: expiryRefreshToken })
}

module.exports = {expiryAccessToken,expiryRefreshToken, maxAgeAccessCookie ,
                maxAgeRefreshCookie, generateAccessToken, generateRefreshToken}