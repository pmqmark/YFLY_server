const Application = require("../models/ApplicationModel")
const bcrypt = require("bcrypt");
const Student = require("../models/StudentModel");
const mongoose = require("mongoose");
const Comment = require("../models/CommentModel");
const Employee = require("../models/EmployeeModel");
const ObjectId = mongoose.Types.ObjectId;
const applicationCtrl = {};

//Create Application;

applicationCtrl.CreateApplication = async(req,res)=>{
    const {studentId,university,program,
        intake,country,creator,steps,
        documents,assignee} = req.body;
    
    console.log("reqBody",req.body)
    
    if(!(typeof studentId === 'string' || ObjectId.isValid(studentId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try {
        const student = await Student.findById(studentId);
        console.log(student)
        if(!student) return res.status(404).json({msg:"Student not found"});
    
        const alreadyExists = await Application.findOne({studentId: new ObjectId(studentId)});
        if(alreadyExists) return res.status(400).json({msg:"Application already exists"});

        const newDocument = new Application({
            studentId : new ObjectId(studentId),
            university,program,
            intake,country,
            creator : new ObjectId(creator),
            steps,
            documents,
            assignee : new ObjectId(assignee)
        });

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
        const application = await Application.findById(applicationId);
        console.log(application);
        res.status(200).json(application);
    }catch(error){
        res.status(500).json({msg:"Something went wrong"})
    }
}

//Update Application;
applicationCtrl.UpdateApplication = async (req,res)=>{
    const {applicationId, ...updates} = req.body;
    console.log(req.body);

    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try {
        const application = await Application.findById(applicationId);
        console.log(application);
        if(!application) return res.status(404).json({msg:"Application not found"});

        const updatedApplication = await Application.findByIdAndUpdate(applicationId,{
            $set: {...updates, updatedAt:Date.now()}
        },{new:true});

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

module.exports = applicationCtrl;