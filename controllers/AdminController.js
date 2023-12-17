const bcrypt = require("bcrypt");
const Admin = require("../models/AdminModel");
const mongoose = require("mongoose");
const Application = require("../models/ApplicationModel");
const Employee = require("../models/EmployeeModel");
const ObjectId = mongoose.Types.ObjectId;
const adminCtrl = {};

// Get Details;
adminCtrl.GetAdmin = async(req,res)=>{
    const adminId = req.params.id;

    if(!(typeof adminId === 'string' || ObjectId.isValid(adminId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try {
        const admin = await Admin.findById(adminId,{password:0});
        console.log(admin);

        if(!admin) return res.status(404).json({msg:"Admin Not found"});

        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }
}

// Update Admin;
adminCtrl.UpdateAdmin = async(req,res)=>{
    console.log(req.body);
    const adminId = req.body.adminId;

    if(!(typeof adminId === 'string' || ObjectId.isValid(adminId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    const admin = await Admin.findById(adminId);
    if(!admin) return res.status(404).json({msg:"Admin not found"});

    if(req.body.name){{
        const nameRegex = /^[A-Za-z ]{3,}$/;
        if(!nameRegex.test(req.body.name)) return res.status(400).json({ msg: "Invalid Name format" });
    }}

    if(req.body.email){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(req.body.email)) return res.status(400).json({ msg: "Invalid Email format" });
    }

    if(req.body.password){
        const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
        if(!passwordRegex.test(req.body.password)) return res.status(400).json({ msg: "Invalid password format" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password,salt);

        req.body.password = hashedPassword;
    }

    try {
        console.log("req.body",req.body);

        const updatedDocument = await Admin.findByIdAndUpdate(adminId,{
            $set : req.body
        },{new:true});
    
        console.log("updatedDoc",updatedDocument)
    
        res.status(200).json({msg:"Admin Updated"});
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:"Something went wrong"});
    }
}

// Change password;
adminCtrl.ChangePassword = async(req,res)=>{
    const adminId = req.body.adminId;
    const password = req.body.password;

    if(!(typeof adminId === 'string' || ObjectId.isValid(adminId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try{
        const admin = await Admin.findById(adminId);
        if(!admin) return res.status(404).json({msg:"Admin not found"});

        const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
        if(!passwordRegex.test(password)) return res.status(400).json({ msg: "Invalid password format" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Admin.findByIdAndUpdate(adminId,{
            $set: {password: hashedPassword}
        })

        res.status(200).json({msg:"Password changed"});
    }catch(error){
        res.status(500).json({msg:"Something went wrong"})
    }
}

// Get Application Metrics ==>Count of Application (All, Current, Completed, Cancelled), Non-enrollments, Deferrals;
// Filters ==> Country, Intake, Date , Year.

adminCtrl.GetApplicationMetrics = async(req,res)=>{
    const country = req.query.country;
    const intake = req.query.intake;
    const startDateQuery = req.query.start_date;
    const endDateQuery = req.query.end_date;
    const year = req.query.year;

    let filters = {};

    if(country){filters.country = {$regex : new RegExp(country, 'i')}};

    if(intake){filters.intake = {$regex : new RegExp(intake, 'i')}};

    if(startDateQuery && endDateQuery){
        const startDate = new Date(`${startDateQuery}T00:00:00.000+05:30`);
        const endDate = new Date(`${endDateQuery}T00:00:00.000+05:30`);
        filters.createdAt = {$gte:startDate, $lte:endDate}
    };

    if(year){
        const yearStart = new Date(`${year}-01-01T00:00:00.000+05:30`);
        const yearEnd = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000+05:30`);

        filters.createdAt = {$gte:yearStart, $lt:yearEnd};
    };

    console.log(filters);

    try {
        const allApplications = await Application.find(filters).countDocuments();
        console.log("all", allApplications);

        const currentApplications = await Application.find({...filters, status: "processing"}).countDocuments();
        console.log("processing", currentApplications);

        const completedApplications = await Application.find({...filters, status: "completed"}).countDocuments();
        console.log("completed", completedApplications);

        const defferredApplications = await Application.find({...filters, status: "deffered"}).countDocuments();
        console.log("deffered", defferredApplications);

        const cancelledApplications = await Application.find({...filters, status: "cancelled"}).countDocuments();
        console.log("cancelled",cancelledApplications);

        const notEnrolledApplications = await Application.find({...filters, status: "not-enrolled"}).countDocuments();
        console.log("not-enrolled",notEnrolledApplications);


        res.status(200).json({
            all:allApplications, 
            current:currentApplications,
            completed:completedApplications,
            deffered:defferredApplications,
            cancelled:cancelledApplications,
            notEnrolled:notEnrolledApplications,
        })

    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }
}


// Assign work to an Employee; 
// ** warning: same work can be assigned many times;
adminCtrl.AssignWork = async(req,res)=>{
    const {applicationId, employeeId} = req.body;

    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    };

    try{
        const application = await Application.findById(applicationId);
        if(!application) return res.status(404).json({msg:"Application not found"});

        const employee = await Employee.findById(employeeId);
        if(!employee) return res.status(404).json({msg:"Employee not found"});

        const prevAssignee = application.assignee;

        if(prevAssignee){
            await Employee.findByIdAndUpdate(prevAssignee,{
                $pull:{currentApplications : application._id}
            });
        }

        // ==> Update the assignee field of Application;
        await Application.findByIdAndUpdate(applicationId,{
            $set:{assignee: employee._id}
        })

        // ==> Push applicationId to the currentApplications of employee;
        await Employee.findByIdAndUpdate(employeeId,{
            $push:{currentApplications: application._id} 
        })

        res.status(200).json({msg:"Work Assigned"})
    }catch(error){
        res.status(500).json({msg:"Something went wrong"})
    }
}


// Remove Assignee from a work;
adminCtrl.RemoveAssignee = async(req,res)=>{
    const {applicationId} = req.body;
    if(!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))){
        return res.status(400).json({msg:"Invalid Id format"});
    };

    try {
        const application = await Application.findById(applicationId);
        if(!application) return res.status(404).json({msg:"Application not found"});
        if(!application.assignee) return res.status(400).json({msg:"No Assignee to remove"})

        const assignee = await Employee.findById(application.assignee);
        if(!assignee) return res.status(404).json({msg:"assignee not found"});

        await Employee.findByIdAndUpdate(assignee,{
            $pull:{ currentApplications: application._id}
        });

        await Application.findByIdAndUpdate(applicationId,{
            $unset:{assignee:""}
        })

        res.status(200).json({msg:"Assignee removed"})
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"});
    }
}


module.exports = adminCtrl;