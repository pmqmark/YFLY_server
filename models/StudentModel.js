const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
    name: {type:String,unique:true},
    email: {type:String,unique:true},
    password:{type:String},
    phone:{type:String},
    birthDate: {type:Date},
    age: {type:Number},
    qualification: {type:String},
    address: {type:{
        houseName:{type:String},
        city:{type:String},
        state:{type:String},
        pin:{type:String},
    }},
    role: {type:String, default:"student", required:true},
    image:{type:String},
    application:{type:mongoose.Types.ObjectId},
})

const Student = mongoose.model("Student", StudentSchema);

module.exports = Student;