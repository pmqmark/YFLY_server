const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    resourceId:{type:mongoose.Types.ObjectId,required:true},
    resourceType:{type:String,required:true},
    commentorId:{type:mongoose.Types.ObjectId,required:true},
    comment:{type:String},
    fromAdmin:{type:Boolean},
    
},{timestamps:true});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;