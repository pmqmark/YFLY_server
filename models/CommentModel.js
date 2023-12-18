const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    applicationId:{type:mongoose.Types.ObjectId,
        ref:'Application',
        required:true},
    commentorId:{type:mongoose.Types.ObjectId,required:true},
    comment:{type:String},
    createdAt:{type:Date, default: Date.now},
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;