const mongoose = require("mongoose");
const Comment = require("../models/CommentModel");
const ObjectId = mongoose.Types.ObjectId;
const commentCtrl = {};

// Get all Comments of an Application;
commentCtrl.GetComments = async(req,res)=>{
    const applicationId = req.params.id;
     
    console.log(applicationId);
    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try {
        const comments = await Comment.aggregate([
            {
                $lookup:{
                    from:"employees",
                    localField:"commentorId",
                    foreignField:"_id",
                    as:"commentorDetails"
                }
            },
            {
                $unwind:"$commentorDetails"
            },
            {
                $match:{applicationId: new ObjectId(applicationId)}
            },
            {
                $project:{
                    "applicationId":1,
                    "commentorDetails.name":1,
                    "comment":1,
                    "createdAt":1
                }
            },{
                $sort:{
                    "_id":-1
                }
            }
        ])

        console.log(comments);

        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"});
    }
}

// Add comment;

commentCtrl.AddComment = async(req,res)=>{
    const {applicationId, 
        commentorId,comment} = req.body;

    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    if(!(typeof commentorId === 'string' || ObjectId.isValid(commentorId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    if(typeof comment !== 'string' ){
        return res.status(400).json({msg:"Invalid Comment"});
    };

    try {
        const newComment = new Comment({
            applicationId: new ObjectId(applicationId),
            commentorId: new ObjectId(commentorId),
            comment
        });

        const savedComment = await newComment.save();
        console.log(savedComment);

        res.status(200).json({data:savedComment, msg:"Comment Added"});

    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }
}


module.exports = commentCtrl;