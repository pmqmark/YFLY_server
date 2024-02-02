const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
    name:{type:String,required:true},
    status:{type:String, default:"pending"},
    startDate:{type:Date},
    endDate:{type:Date},
    members:{type:Array, default:[]},
    tasks:{type:Array,default:[]},

},{timestamps:true});

const Project = mongoose.model("Project", ProjectSchema);

module.exports = Project;