const Application = require("../models/ApplicationModel")
const bcrypt = require("bcrypt");
const Student = require("../models/StudentModel");
const mongoose = require("mongoose");
const Comment = require("../models/CommentModel");
const Employee = require("../models/EmployeeModel");
const ObjectId = mongoose.Types.ObjectId;
const applicationCtrl = {};

const partneredData = require("../datas/partnered.json");
const nonPartneredData = require("../datas/non-partnered.json");

//Create Application;

applicationCtrl.CreateApplication = async(req,res)=>{
    const {studentId,university,program,
        intake,country,creator,assignee,partnership} = req.body;
    
    console.log("reqBody",req.body);

    if(!(typeof studentId === 'string' || ObjectId.isValid(studentId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    let steps = [];
    if(partnership === "partnered"){
        steps = partneredData.filter((step)=>{
            return (step.country === "common" || step.country === country)
        })
    }
    else if(partnership === "non-partnered"){
        steps = [...nonPartneredData]
    }

    let schemaObject = {
        studentId : new ObjectId(studentId),
        university,program,
        intake,country,
        creator : new ObjectId(creator),
        steps
    }
    
    if((typeof assignee==="string" || ObjectId.isValid(assignee))){
       steps = steps.map((step)=>{
                if(step._id === 1){
                    return {...step, status:"pending", assignee : new ObjectId(assignee)}
                }

                return step
               });

       schemaObject = {
            studentId : new ObjectId(studentId),
            university,program,
            intake,country,
            creator : new ObjectId(creator),
            steps,
            assignee: new ObjectId(assignee)
        }   
    }

    try {
        const student = await Student.findById(studentId);
        console.log(student)
        if(!student) return res.status(404).json({msg:"Student not found"});
    
        const alreadyExists = await Application.findOne({studentId: new ObjectId(studentId)});
        if(alreadyExists) return res.status(400).json({msg:"Application already exists"});

        const newDocument = new Application(schemaObject);

        const application = await newDocument.save();
        console.log("application",application);

        await Student.findByIdAndUpdate(studentId,{
            $set:{applicationId: application._id}
        })

        res.status(200).json({msg:"New Application Created"})
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:"Something went wrong"})
    }
}

//Get All Applications;
applicationCtrl.GetAllApplications = async(req,res)=>{
    // filters
    const country = req.query.country;
    const intake = req.query.intake;
    const createdDateQuery = req.query.created_date;
    const year = req.query.year;
    const status = req.query.status;
    const university = req.query.university;
    const ackNmbr = req.query.ack_nmbr;
    const program = req.query.program;
    const studentName = req.query.student_name;

    // Paginators
    const page = req.query.page;
    const entries = req.query.entries;

    let filters = {};

    if(country){filters.country = {$regex : new RegExp(country, 'i')}};

    if(intake){filters.intake = {$regex : new RegExp(intake, 'i')}};

    if(createdDateQuery){
        filters.createdAt = new Date(`${createdDateQuery}T00:00:00.000+05:30`)
    };

    if(year){
        const yearStart = new Date(`${year}-01-01T00:00:00.000+05:30`);
        const yearEnd = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000+05:30`);
        filters.createdAt = {$gte:yearStart, $lt:yearEnd};
    };

    if(status){filters.status = {$regex : new RegExp(status, 'i')}};

    if(university){filters.university = {$regex : new RegExp(university, 'i')}};

    if(ackNmbr){filters._id = new ObjectId(ackNmbr)};

    if(program){filters.program = {$regex : new RegExp(program, 'i')}};

    console.log(filters);

    try {

        const allApplications = await Application.aggregate([
                    {
                        $lookup: {
                        from: "students",
                        localField: "studentId",
                        foreignField: "_id",
                        as: "studentDetails"
                        }
                    },
                    {
                        $unwind: "$studentDetails"
                    },
                    {
                        $lookup: {
                            from: "admins",
                            localField: "creator",
                            foreignField: "_id",
                            as: "creatorDetails"
                        }
                    },
                    {
                        $unwind: "$creatorDetails"
                    },
                    {
                        $lookup: {
                        from: "employees",
                        localField: "assignee",
                        foreignField: "_id",
                        as: "assigneeDetails"
                        }
                    },
                    {
                        $unwind: {
                          path: "$assigneeDetails",
                          preserveNullAndEmptyArrays: true, // Include documents with no assignee
                        },
                    },
                    {
                        $match: {
                        ...filters,
                        "studentDetails.name": studentName ? { $regex: new RegExp(studentName, 'i') } : { $exists: true }
                        }
                    },
                    {
                        $project: {
                            "_id": 1,
                            "studentId": 1,
                            "university": 1,
                            "intake": 1,
                            "country": 1,
                            "creator": 1,
                            "steps": 1,
                            "documents": 1,
                            "status":1,
                            "createdAt": 1,
                            "updatedAt": 1,
                            "program": 1,
                            "assignee":1,
                            "studentDetails.name":1,
                            "assigneeDetails.name":1,
                            "assigneeDetails.phone":1,
                            "creatorDetails.name":1,
                        }
                    },
                ]);

                
        console.log("all-applications",allApplications);

        let result;

        if(page){
            if(entries){
                result = allApplications.splice(((page-1)*entries),(page*entries))
            }else{
                result = allApplications.splice(((page-1)*10),(page*10))
            }
        }else{
            result = allApplications;
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }
}

//Get an Application;
applicationCtrl.GetApplication = async(req,res)=>{
    const applicationId = req.params.id;

    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try{
        let application = await Application.findById(applicationId).lean();
        if(!application) return res.status(404).json({msg:"Application doesn't exist"});

        const student = await Student.findById(application.studentId);
        if(!student) return res.status(404).json({msg:"Student doesn't exist"});

        const result = {...application,"studentName":student.name}
        console.log("application with student name",result);
        res.status(200).json(result);
    }catch(error){
        res.status(500).json({msg:"Something went wrong"})
    }
}

//Update Application;
applicationCtrl.UpdateApplication = async (req,res)=>{
    const {applicationId, stepNumber, stepStatus, stepAssignee, ...updates} = req.body;
    console.log(req.body);

    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }
    
    try {
        const application = await Application.findById(applicationId);
        console.log(application);
        if(!application) return res.status(404).json({msg:"Application not found"});
        
        if(stepNumber){
            if(stepStatus){
                await Application.findOneAndUpdate({_id:applicationId, 'steps':{$elemMatch:{_id:stepNumber}}},
                {$set:{'steps.$.status':stepStatus}},{new:true}
                )
            }
    
            if(stepAssignee){
                await Application.findOneAndUpdate({_id:applicationId, 'steps':{$elemMatch:{_id:stepNumber}}},
                {$set:{'steps.$.assignee':stepAssignee}},{new:true}
                )
    
                updates.assignee = stepAssignee;
            }
        }

        const updatedApplication = await Application.findByIdAndUpdate(applicationId,
            {$set: {...updates, updatedAt:Date.now()}},
            {new:true});

        console.log(updatedApplication);

        res.status(200).json({msg:"Application Updated"})
        
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }

}

//Delete Application;
applicationCtrl.DeleteApplication = async(req,res)=>{
    const applicationId = req.params.id;

    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try {
        const application = await Application.findById(applicationId);
        if(!application) return res.status(404).json({msg:"Application doesn't exist"});

        await Application.findByIdAndDelete(applicationId)
        .then(async()=>{
            await Employee.findByIdAndUpdate(application.assignee,{
                $pull:{currentApplications : application._id}
            });

            await Comment.deleteMany({applicationId});
        })
        .catch((error)=>{
            console.log(error)
        })

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"});
    }
}


// Upload files to AWS S3 Bucket 2nd part => Update doc with uploaded urls;

applicationCtrl.UploadDoc = async(req,res)=>{
    const applicationId = req.params.id;
    const {docName} = req.body;

    console.log("*applicationId*",applicationId)
    if(!applicationId) return res.status(500).json({msg:"Invalid applicationId"})

    console.log("req.body", req.body)
    console.log("req.file",req.file)

    const newDocument = {name:docName, location: req.file.location};

    try {
        await Application.findByIdAndUpdate(applicationId,{
            $push:{documents:newDocument}
        })
        
        res.status(200).json({msg:"Documents uploaded successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({msg:"Documents upload  failed"})
    }

}

module.exports = applicationCtrl;