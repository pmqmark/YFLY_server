const mongoose = require('mongoose');

const FollowupSchema = new mongoose.Schema({
    studentId:{type:mongoose.Types.ObjectId, unique:true, required:true , ref: 'Student'},
    assignee: { type: mongoose.Types.ObjectId, default: null, ref: 'Employee' },
    stage: { type: mongoose.Types.ObjectId, default: null },
    communication: [
        { type: mongoose.Types.ObjectId }
    ],
    notes: [
        {
            type:{
                author: { type: mongoose.Types.ObjectId ,ref: 'Employee'},
                content: {type: String}
            }
        }
    ]
    
},{timestamps:true})

const Followup = mongoose.model("Followup",FollowupSchema);

module.exports = Followup;