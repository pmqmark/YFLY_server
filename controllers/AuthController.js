const Admin = require("../models/AdminModel")
const Employee = require("../models/EmployeeModel")
const Student = require("../models/StudentModel");
const OtpModel = require("../models/OtpModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const authCtrl = {};

const expiryAccessToken = "1h";
const expiryRefreshToken = "30d";

const maxAgeAccessCookie = 1000*60*60;
const maxAgeRefreshCookie = 1000*60*60*24*30;

//Create Access Token;

const generateAccessToken = (userInfo) => {
    return jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: expiryAccessToken })
}

//Create Refresh Token;

const generateRefreshToken = (userInfo) => {
    return jwt.sign(userInfo, process.env.REFRESH_TOKEN_SECRET, { expiresIn: expiryRefreshToken })
}

//Create OTP
const generateOTP = ()=>{
    const digits = "0123456789";

    let otp = "";

    for(let i=0; i < 6; i++){
        otp += digits[Math.floor(Math.random() * 10)]
    }

    return otp;
}

// Authentication method for Admin/Employee/Student;

authCtrl.Login = async (req, res) => {
    const email  = req.body.email;
    console.log("email",email)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: "Invalid Email format" });

    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    if(!passwordRegex.test(req.body.password)) return res.status(400).json({ msg: "Invalid password format" });

    try {
        const admin = await Admin.findOne({ email }).lean();
        const employee = await Employee.findOne({ email }).lean();
        const student = await Student.findOne({ email }).lean();

        let user;

        if(admin){
            user = admin;
        } else if(employee){
            user = employee;
        } else if(student){
            user = student;
        } else{
            return res.status(401).json({ msg: "Invalid email" })
        }

        const isValidPassword = await bcrypt.compare(req.body.password, user.password);
        if (!isValidPassword) return res.status(401).json({ msg: "Invalid password" });

        const accessToken = generateAccessToken({ userId: user._id, role: user.role })

        const refreshToken = generateRefreshToken({ userId: user._id, role: user.role })

        const { password, ...userInfo } = user;

        res.cookie('access_token', accessToken, { httpOnly: true, maxAge: maxAgeAccessCookie });
        res.cookie('refresh_token', refreshToken, { httpOnly: true, maxAge: maxAgeRefreshCookie })

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

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(400)

        const accessToken = generateAccessToken({ userId: user._id, role: user.role });

        res.cookie("access_token", accessToken, { httpOnly: true, maxAge: maxAgeAccessCookie })

        res.json({ msg: "Access token regenerated" });
    })
}

//Terminate session by deleting tokens in frontend;

authCtrl.Logout = async (req, res) => {

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.sendStatus(204)
}

//Sent OTPs to The Mail id
authCtrl.SendOTP = async(req,res)=>{
    const email = req.body.email;
    console.log(email)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: "Invalid Email format" });

    const student = await Student.findOne({email}).lean();
    const employee = await Employee.findOne({email}).lean();

    if(!student && !employee){
        return res.status(404).json({msg:"You are not registered with us"})
    }

    const otpExisting = await OtpModel.findOne({email})
    if(otpExisting){
        await OtpModel.findByIdAndDelete(otpExisting._id);
    }

    try {
        const OTP = generateOTP(); 

        const otpDoc = new OtpModel({email,otp:OTP})
        await otpDoc.save();

        const transporter = nodemailer.createTransport({
            host:"smtp.gmail.com",
            port:465,
            secure:true,
            auth: {
              user:process.env.MAIL_USER,
              pass:process.env.MAIL_PASSWORD
            }
          });
        
          const mailOptions = {
            from:process.env.MAIL_USER,
            to: email,
            subject: "OTP to Change Password",
            text: OTP
          };
        
          transporter.sendMail(mailOptions, (error, info)=> {
            if (error) {
              console.log(error);
              return res.status(500).json({msg:"Couldn't Sent OTP "});
            } else {
              console.log('Email sent: ' + info.response);
              return res.status(200).json({msg:"OTP Sent Successfully"})
            }
          });

    }catch(error){
        console.error(error);
        res.status(500).json({msg:'Something went wrong'})
    }
}


//Verify Email id;
authCtrl.VerifyMail = async(req,res)=>{
    const otp = req.body.otp;
    const email = req.body.email;

    if(typeof otp !== 'string') return res.status(400).json({msg:"Invalid OTP format"})
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: "Invalid Email format" });
    
    try {
        const validOtp = await OtpModel.findOne({email,otp});
        
        if(!validOtp){
            return res.status(403).json({msg:'Invalid Otp number'})
        }
    
        await OtpModel.findByIdAndDelete(validOtp._id)
        
        res.status(200).json({msg:"Email verified"});
        
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"});
        
    }
}

module.exports = authCtrl;