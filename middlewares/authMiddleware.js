const jwt = require("jsonwebtoken");
const { generateAccessToken, maxAgeAccessCookie } = require("./tokenMiddlewares");

const authMiddleware = async (req, res, next) => {
    let token = req.cookies.access_token;

    // if token is not present in the cookies;
    if (!token) {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) return res.status(401).json({ msg: "no_refresh_token", tokenFlag: true });

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) {
                return res.status(401).json({ msg: "refresh token verification failed", tokenFlag: true });
            } else {
                token = generateAccessToken({ userId: user._id, role: user.role });
                res.cookie("access_token", token, { httpOnly: true, maxAge: maxAgeAccessCookie });
		        req.user = user;
                next(); 
            }
        });
    } else {
        try {
            // if the token is present 
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            // if the token is present but expired or fake;
            res.status(401).json({ msg: "Unauthorized: Invalid Token", tokenFlag: true });
        }
    }
};

module.exports = authMiddleware;
