const Employee = require("../models/EmployeeModel")
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Application = require("../models/ApplicationModel");
const ObjectId = mongoose.Types.ObjectId;
const employeeCtrl = {};

//Create Employee;

employeeCtrl.CreateEmployee = async(req,res)=>{

    const {name,email,password,phone,education,
        department,birthDate,address,image,
        currentApplications} = req.body;

    console.log(req.body)

    if(!name || !email || !password){
        return res.status(400).json({msg:"Invalid inputs"})
    }   

    const nameRegex = /^[A-Za-z ]{3,}$/;
    if(!nameRegex.test(name)) return res.status(400).json({ msg: "Invalid Name format" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: "Invalid Email format" });

    const phoneNumberRegex = /^\d{10}$/;
    if(!phoneNumberRegex.test(phone)) return res.status(400).json({msg: "Invalid Phone number"});

    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    if(!passwordRegex.test(password)) return res.status(400).json({ msg: "Invalid password format" });

    const alreadyExists = await Employee.findOne({email}).lean();
    if(alreadyExists){
        return res.status(400).json({msg:"Employee already exists"})
    }

    try{
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);

        const newDocument = new Employee({
            name,email,phone,
            password:hashedPassword,
            education,department,
            birthDate,address,image,
            currentApplications
        });

        const savedDoc = await newDocument.save();
        console.log("Saved employee", savedDoc);

        res.status(200).json({msg:"New employee created"});
    }catch(error){
        console.error(error);
        res.status(500).json({msg:"Something went wrong"})
    }
}

//Get All Employees;

employeeCtrl.GetAllEmployees = async(req,res)=>{
    
    try {
        const allEmployees = await Employee.find({isActive:true},{password: 0});
        console.log(allEmployees);
    
        res.status(200).json(allEmployees);
        
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }
}

//Get an employee;

employeeCtrl.GetEmployee = async(req,res)=>{
    const empId = req.params.id; 

    if(!(typeof empId === 'string' || ObjectId.isValid(empId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    try {
        const employee = await Employee.findById(empId,{password:0});
        console.log(employee);

        if(!employee) return res.status(404).json({msg:"Employee not found"});

        res.status(200).json(employee);
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"});
    }
}

//Update Employee

employeeCtrl.UpdateEmployee = async(req,res)=>{
    console.log(req.body);
    const empId = req.body.employeeId; 

    if(!(typeof empId === 'string' || ObjectId.isValid(empId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    const employee = await Employee.findById(empId);
    if(!employee) return res.status(404).json({msg:"Employee not found"})

    if(req.body.name){{
        const nameRegex = /^[A-Za-z ]{3,}$/;
        if(!nameRegex.test(req.body.name)) return res.status(400).json({ msg: "Invalid Name format" });
    }}

    if(req.body.email){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(req.body.email)) return res.status(400).json({ msg: "Invalid Email format" });
    }

    if(req.body.phone){
        const phoneNumberRegex = /^\d{10}$/;
        if(!phoneNumberRegex.test(phone)) return res.status(400).json({msg: "Invalid Phone number"});
    }

    let {employeeId, ...updates} = req.body;

    if(req.body.password){
        const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
        if(!passwordRegex.test(req.body.password)) return res.status(400).json({ msg: "Invalid password format" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password,salt);

        updates.password = hashedPassword;
    }

    try {
        console.log("updates",updates);

        const updatedDocument = await Employee.findByIdAndUpdate(empId,{
            $set : updates
        },{new:true});
    
        console.log("updatedDoc",updatedDocument)
    
        res.status(200).json({msg:"Employee Updated"});
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:"Something went wrong"});
    }
}

//Change password; 

employeeCtrl.ChangePassword = async(req,res)=>{
    const empId = req.body.employeeId;
    const password = req.body.password;

    if(!(typeof empId === 'string' || ObjectId.isValid(empId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    const employee = await Employee.findById(empId);
    if(!employee) return res.status(404).json({msg:"Employee not found"});

    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    if(!passwordRegex.test(password)) return res.status(400).json({ msg: "Invalid password format" });

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Employee.findByIdAndUpdate(empId,{
            $set : {password : hashedPassword}
        })
        
        res.status(200).json({msg:"Password Changed"})
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }

}


//Deacivate Employee;

employeeCtrl.DeactivateEmployee = async(req,res)=>{
    const empId = req.body.employeeId;
    
    if(!(typeof empId === 'string' || ObjectId.isValid(empId))){
        return res.status(400).json({msg:"Invalid Id format"});
    }

    const employee = await Employee.findById(empId);
    if(!employee) return res.status(404).json({msg:"Employee not found"});

    try{
        await Employee.findByIdAndUpdate(empId,{
            $set:{isActive:false}
        });

        res.status(200).json({msg:"Employee deactivated"})
    }catch(error){
        res.status(500).json({msg:"Something went wrong"})
    }
}


//Get Assigned Works for an Employee;

employeeCtrl.GetAssignedWorks = async(req,res)=>{
    const employeeId = req.params.id;

    if(!employeeId) return res.status(400).json({msg:"Invalid Employee Id"});

    try {
        const employee = await Employee.findById(employeeId);
        if(!employee) return res.status(404).json({msg:"Employee Not Found"});

        const currentApplications = employee.currentApplications;

        const works = await Application.aggregate([
            {
                $lookup:{
                    from:"students",
                    localField:"studentId",
                    foreignField:"_id",
                    as:"studentDetails"
                }
            },
            {
                $unwind:"$studentDetails"
            },
            {
                $match:{
                    _id : {$in:[...currentApplications]}
                }
            },
            {
                $project:{
                    _id:1,
                    "university":1,
                    "country":1,
                    "program":1,
                    "intake":1,
                    "status":1,
                    "studentDetails._id":1,
                    "studentDetails.name":1,
                    "studentDetails.email":1,
                    "studentDetails.phone":1,
                    "studentDetails.age":1,
                    "studentDetails.address":1,
                    "studentDetails.image":1,
                }
            }
        ]);

        console.log("works",works);

        res.status(200).json(works)
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }

}


module.exports = employeeCtrl;