const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
    name: {type:String,required:true},
    email: {type:String,unique:true},
    phone:{type:Number},
    password:{type:String},
    birthDate: {type:Date},
    qualification: {type:String},
    address: {type:{
        houseName:{type:String},
        city:{type:String},
        state:{type:String},
        pin:{type:String},
    }},
    role: {type:String, default:"student", required:true},
    image:{type:String},
    applicationId:{type:mongoose.Types.ObjectId},
    office:{type:String}
    
},{timestamps:true})

const Student = mongoose.model("Student", StudentSchema);

module.exports = Student;