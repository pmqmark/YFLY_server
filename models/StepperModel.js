const mongoose = require("mongoose");

const StepperSchema = new mongoose.Schema({
    applicationId:{type:mongoose.Types.ObjectId},
    university:{type:String, required:true},
    partnership:{type:String},
    steps:{type:[
        {   
            _id:{type:Number},
            name:{type:String},
            groupStatus:{type:String},
            status:{type:String},
            assignee:{type:mongoose.Types.ObjectId}
        }
    ],
    default:[]},

},{timestamps:true})

const Stepper = mongoose.model("Stepper",StepperSchema)

module.exports = Stepper;