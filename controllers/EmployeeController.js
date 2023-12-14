const Employee = require("../models/EmployeeModel")
const bcrypt = require("bcrypt");
const { findByIdAndUpdate } = require("../models/StudentModel");
const emailGenerator = require("../utils/EmailGenerator");
const employeeCtrl = {};

//Create Employee;

employeeCtrl.CreateEmployee = async(req,res)=>{

    const {name,email,password,education,
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
            name,email,
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
    if(!empId) return res.status(400).json({msg:"Missing employee id"})

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
    if(!empId) return res.status(400).json({msg:"Missing employee id"});

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

    if(!empId) return res.status(400).json({msg:"Missing employee id"});

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
    
    if(!empId) return res.status(400).json({msg:"Missing employee id"});

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


module.exports = employeeCtrl;