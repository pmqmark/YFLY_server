const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
    studentId:{type:mongoose.Types.ObjectId,unique:true,required:true},
    intakes:{type:Array, default:[]},
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
    statuses:{type:Array,default:[]},
    assignee:{type:mongoose.Types.ObjectId},
 
},{timestamps:true});


const Application = mongoose.model("Application", ApplicationSchema);

module.exports = Application;