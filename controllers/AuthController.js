const Admin = require("../models/AdminModel")
const Employee = require("../models/EmployeeModel")
const Student = require("../models/StudentModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { maxAgeAccessCookie, maxAgeRefreshCookie,
    generateAccessToken, generateRefreshToken } = require("../middlewares/tokenMiddlewares");
const authCtrl = {};


// Authentication method for Admin/Employee/Student;
authCtrl.Login = async (req, res) => {
    const email = req.body.email;
    console.log("email", email)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: "Invalid Email format" });

    try {
        const emailCaseRegex = new RegExp(email, 'i')

        const admin = await Admin.findOne({ email: emailCaseRegex }).lean();
        const employee = await Employee.findOne({ email: emailCaseRegex, isActive: true }).lean();
        const student = await Student.findOne({ email: emailCaseRegex, isActive: true }).lean();

        let user;

        if (admin) {
            user = admin;
        } else if (employee) {
            user = employee;
        } else if (student) {
            user = student;
        } else {
            return res.status(401).json({ msg: "Invalid email or password" })
        }

        const isValidPassword = await bcrypt.compare(req.body.password, user.password);
        if (!isValidPassword) return res.status(401).json({ msg: "Invalid email or password" });

        const accessToken = generateAccessToken({ userId: user._id, role: user.role })

        const refreshToken = generateRefreshToken({ userId: user._id, role: user.role })

        const { password, ...userInfo } = user;

        // res.cookie('access_token', accessToken, { httpOnly: true, maxAge: maxAgeAccessCookie });
        // res.cookie('refresh_token', refreshToken, { httpOnly: true, maxAge: maxAgeRefreshCookie })
        res.cookie('access_token', accessToken, { httpOnly: true, sameSite: "None", secure: true, maxAge: maxAgeAccessCookie });
        res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: "None", secure: true, maxAge: maxAgeRefreshCookie })

        res.status(200).json(userInfo)

    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Something went wrong" })
    }
}

//Regenerate Access Token using Refresh Token;
authCtrl.regenerateAccessToken = async (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    if (typeof refreshToken !== 'string') return res.sendStatus(400);

    try {
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(400)

            const accessToken = generateAccessToken({ userId: user._id, role: user.role });

            res.cookie("access_token", accessToken, { httpOnly: true, maxAge: maxAgeAccessCookie })

            res.json({ msg: "Access token regenerated" });
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Something went wrong" })

    }

}

//Terminate session by deleting tokens in frontend;

authCtrl.Logout = async (req, res) => {

    try {
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");

        res.sendStatus(204)

    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Something went wrong" })

    }

}


module.exports = authCtrl;