const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
    projectId:{type:mongoose.Types.ObjectId},
    assignee:{type:mongoose.Types.ObjectId},
    taskName:{type:String},
    taskStatus:{type:String, default:"pending"},
    comments:{type:Array, default:[]}
  
},{timestamps:true});

const Task = mongoose.model("Task", TaskSchema);

module.exports = Task;