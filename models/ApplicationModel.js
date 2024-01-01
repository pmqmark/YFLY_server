const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
    studentId:{type:mongoose.Types.ObjectId,unique:true,required:true},
    university:{type:String},
    program:{type:String},
    intake:{type:String},
    country:{type:String,required:true},
    creator:{type:mongoose.Types.ObjectId,required:true},
    steps:{type:[
                    {   
                        _id:{type:Number},
                        name:{type:String},
                        status:{type:String},
                        assignee:{type:mongoose.Types.ObjectId}
                    }
                ],
         default:[]},
    documents:{type:[
                        {
                            name:{type:String},
                            location:{type:String}
                        }
                    ],
         default:[]},
    status:{type:String,
            default:"pending",
            enum:["pending", "processing", "completed", "enrolled", "cancelled", "deffered", "not-enrolled"]
           },
    assignee:{type:mongoose.Types.ObjectId},
    createdAt:{type:Date, default:Date.now},
    updatedAt:{type:Date, default:Date.now},
});


const Application = mongoose.model("Application", ApplicationSchema);

module.exports = Application;