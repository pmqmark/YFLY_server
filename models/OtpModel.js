const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
    email:{type:String, required:true},
    otp:{type:String, required:true},
    createdAt: { type: Date, default: Date.now, expires:'5m' },
})

const OtpModel = mongoose.model("Otp", OtpSchema);

module.exports = OtpModel;