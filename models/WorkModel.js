const mongoose = require('mongoose');

const WorkSchema = new mongoose.Schema({
    applicationId:{type:mongoose.Types.ObjectId, required:true},
    stepperId:{type:mongoose.Types.ObjectId, required:true},
    studentId:{type:mongoose.Types.ObjectId},
    assignee:{type:mongoose.Types.ObjectId, required:true},
    stepNumber:{type:Number, required:true},
    stepStatus:{type:String},
    
},{timestamps:true})

const Work = mongoose.model("Work",WorkSchema);

module.exports = Work;