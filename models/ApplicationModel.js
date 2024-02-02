const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
    studentId:{type:mongoose.Types.ObjectId,unique:true,required:true},
    program:{type:String},
    intake:{type:String},
    country:{type:String,required:true},
    creator:{type:mongoose.Types.ObjectId,required:true},
    steppers:{type:Array,default:[]},
    documents:{type:[
                        {
                            name:{type:String},
                            key:{type:String},
                            location:{type:String}
                        }
                    ],
         default:[]},
    status:{type:String,
            default:"pending",
            enum:["pending", "ongoing", "completed", "enrolled", "cancelled", "deffered", "not-enrolled"]
           },
    assignee:{type:mongoose.Types.ObjectId},
 
},{timestamps:true});


const Application = mongoose.model("Application", ApplicationSchema);

module.exports = Application;