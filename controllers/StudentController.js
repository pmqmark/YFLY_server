const Student = require("../models/StudentModel")
const bcrypt = require("bcrypt");
const studentCtrl = {};

//Create Student;

studentCtrl.CreateStudent = async(req,res)=>{

    const {name,email,password,phone,
        birthDate,age,qualification,
        address,image} = req.body;
        
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

    const alreadyExists = await Student.findOne({email}).lean();
    if(alreadyExists){
        return res.status(400).json({msg:"Student already exists"})
    }

    try{
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newDocument = new Student({
            name,email,
            password:hashedPassword,
            phone,birthDate,age,
            qualification,address,image
        });

        const savedDoc = await newDocument.save();
        console.log("Saved Student", savedDoc);
        
        res.status(200).json({msg:"New Student created"})
    }catch(error){
        console.error(error);
        res.status(500).json({msg:"Something went wrong"});
    }
}

//Get All Students;

studentCtrl.GetAllStudents = async(req,res)=>{
    try{
        const allStudents = await Student.find({},{password:0});
        console.log(allStudents);

        res.status(200).json(allStudents);

    }catch(error){
        res.status(500).json({msg:"Something went wrong"});
    }
}

//Get A Student;

studentCtrl.GetStudent = async(req,res)=>{
    const stdtId = req.params.id;
    if(!stdtId) return res.status(400).json({msg:"Missing Student Id"})

    try{
        const student = await Student.findById(stdtId,{password:0});
        console.log(student);

        if(!student) return res.status(404).json({msg:"Student not found"});

        res.status(200).json(student);
    }catch(error){
        res.status(500).json({msg:"Something went wrong"});
    }
}

//Update Student;

studentCtrl.UpdateStudent = async(req,res)=>{
    console.log(req.body);
    const stdtId = req.body.studentId;
    if(!stdtId) return res.status(400).json({msg:"Missing student id"});

    const student = await Student.findById(stdtId);
    if(!student) return res.status(404).json({msg:"Student not found"});

    if(req.body.name){{
        const nameRegex = /^[A-Za-z ]{3,}$/;
        if(!nameRegex.test(req.body.name)) return res.status(400).json({ msg: "Invalid Name format" });
    }}

    if(req.body.email){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(req.body.email)) return res.status(400).json({ msg: "Invalid Email format" });
    }

    let {studentId, ...updates} = req.body;

    if(req.body.password){
        const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
        if(!passwordRegex.test(req.body.password)) return res.status(400).json({ msg: "Invalid password format" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password,salt);

        updates.password = hashedPassword;
    }

    try {
        console.log("updates",updates);

        const updatedDocument = await Student.findByIdAndUpdate(stdtId,{
            $set : updates
        },{new:true});
    
        console.log("updatedDoc",updatedDocument)
    
        res.status(200).json({msg:"Student Updated"});
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:"Something went wrong"});
    }
}


//Change Password;

studentCtrl.ChangePassword = async(req,res)=>{
    const stdtId = req.body.studentId;
    const password = req.body.password;

    if(!stdtId) return res.status(400).json({msg:"Missing student id"});

    const student = await Student.findById(stdtId);
    if(!student) return res.status(404).json({msg:"Student not found"});

    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    if(!passwordRegex.test(password)) return res.status(400).json({ msg: "Invalid password format" });

    try{
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Student.findByIdAndUpdate(stdtId,{
            $set: {password: hashedPassword}
        })

        res.status(200).json({msg:"Password changed"});
    }catch(error){
        res.status(500).json({msg:"Something went wrong"})
    }
}





module.exports = studentCtrl;