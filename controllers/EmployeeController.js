const Employee = require("../models/EmployeeModel")
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Application = require("../models/ApplicationModel");
const Work = require("../models/WorkModel");
const Project = require("../models/ProjectModel");
const Task = require("../models/TaskModel");
const Stepper = require("../models/StepperModel")
const ObjectId = mongoose.Types.ObjectId;

const employeeCtrl = {};

//Create Employee;

employeeCtrl.CreateEmployee = async (req, res) => {

    const { name, email, password, phone, education,
        department, birthDate, address, office } = req.body;

    console.log("req.body", req.body);
    console.log("req.file", req.file);

    if (!department) return res.status(400).json({ msg: "Invalid Department" });

    try {

        let image;
        if (req.file) {
            image = req.file.location
        }

        if (name) {
            const nameRegex = /^[A-Za-z ]{3,}$/;
            if (!nameRegex.test(name)) return res.status(400).json({ msg: "Invalid Name format" });

        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return res.status(400).json({ msg: "Invalid Email format" });

            const alreadyExists = await Employee.findOne({ email }).lean();
            if (alreadyExists) {
                return res.status(400).json({ msg: "Employee already exists" })
            }
        }



        let createObj = {
            name, email, phone,
            education, department,
            birthDate,
            image, office
        }

        if (address) { createObj.address = address }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        createObj.password = hashedPassword;

        const newDocument = new Employee(createObj);

        const savedDoc = await newDocument.save();
        console.log("Saved employee", savedDoc);

        res.status(200).json({ msg: "New employee created" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Something went wrong" })
    }
}

//Get All Employees;

employeeCtrl.GetAllEmployees = async (req, res) => {
    const department = req.query.department;
    const name = req.query.name;
    const email = req.query.email;
    const searchQuery = req.query.search;
    console.log("department", department)

    // Paginators
    const page = req.query.page;
    const entries = req.query.entries;

    const ORArray = [
        { name: { $regex: new RegExp(searchQuery, "i") } },
        { email: { $regex: new RegExp(searchQuery, "i") } },
        { department: { $regex: new RegExp(searchQuery, "i") } }
    ];

    if (ObjectId.isValid(searchQuery)) {
        ORArray.push({ _id: new ObjectId(searchQuery) })
    }

    let filters = {
        $or: [...ORArray],
        name: { $regex: new RegExp(name, "i") },
        email: { $regex: new RegExp(email, "i") },
        department: { $regex: new RegExp(department, "i") },
    }

    try {
        const allEmployees = await Employee.find({ isActive: true, ...filters }, { password: 0 });
        console.log("allEmployeess", allEmployees);

        let result

        if (page) {
            if (entries) {
                result = allEmployees.slice(((page - 1) * entries), (page * entries))
            } else {
                result = allEmployees.slice(((page - 1) * 10), (page * 10))
            }
        } else {
            result = allEmployees;
        }

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}

//Get an employee;

employeeCtrl.GetEmployee = async (req, res) => {
    const empId = req.params.id;

    if (!(typeof empId === 'string' || ObjectId.isValid(empId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const employee = await Employee.findById(empId, { password: 0 });
        console.log(employee);

        if (!employee) return res.status(404).json({ msg: "Employee not found" });

        res.status(200).json(employee);
    } catch (error) {
        console.log("error", error)
        res.status(500).json({ msg: "Something went wrong" });
    }
}

//Update Employee

employeeCtrl.UpdateEmployee = async (req, res) => {
    console.log(req.body);
    const employeeId = req.params.id;
    const updates = req.body;

    if (!(typeof employeeId === 'string' || ObjectId.isValid(employeeId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ msg: "Employee not found" })

        if (updates.name) {
            const nameRegex = /^[A-Za-z ]{3,}$/;
            if (!nameRegex.test(updates.name)) return res.status(400).json({ msg: "Invalid Name format" });
        }

        if (updates.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updates.email)) return res.status(400).json({ msg: "Invalid Email format" });
        }

        if (req.file) {
            updates.image = req.file.location
        }

        if (updates.password) {

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(updates.password, salt);

            updates.password = hashedPassword;
        }

        console.log("updates", updates);

        const updatedDocument = await Employee.findByIdAndUpdate(employeeId, {
            $set: updates
        }, { new: true });

        console.log("updatedDoc", updatedDocument)

        res.status(200).json({ msg: "Employee Updated" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Something went wrong" });
    }
}

//Change password; 

employeeCtrl.ChangePassword = async (req, res) => {
    const empId = req.body.employeeId;
    const password = req.body.password;

    if (!(typeof empId === 'string' || ObjectId.isValid(empId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const employee = await Employee.findById(empId);
        if (!employee) return res.status(404).json({ msg: "Employee not found" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Employee.findByIdAndUpdate(empId, {
            $set: { password: hashedPassword }
        })

        res.status(200).json({ msg: "Password Changed" })
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}


//Deacivate Employee;

employeeCtrl.DeactivateEmployee = async (req, res) => {
    const empId = req.params.id;

    if (!(typeof empId === 'string' || ObjectId.isValid(empId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const employee = await Employee.findById(empId);
        if (!employee) return res.status(404).json({ msg: "Employee not found" });

        await Employee.findByIdAndUpdate(empId, {
            $set: { isActive: false }
        });

        res.status(200).json({ msg: "Employee deleted" })
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}


employeeCtrl.RetrieveWorks = async (req, res) => {
    const employeeId = req.params.id;

    if (!employeeId) return res.status(400).json({ msg: "Invalid Employee Id" });

    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ msg: "Employee Not Found" });


        const result = await Work.aggregate([
            {
                $match: { assignee: new ObjectId(employeeId), stepStatus: { $ne: "completed" } }
            },
            {
                $lookup: {
                    from: 'applications',
                    localField: 'applicationId',
                    foreignField: '_id',
                    as: 'applicationDetails'
                }
            },
            {
                $unwind: '$applicationDetails'
            },
            {
                $lookup: {
                    from: 'steppers',
                    localField: 'stepperId',
                    foreignField: '_id',
                    as: 'stepperDetails'
                }
            },
            {
                $unwind: '$stepperDetails'
            },
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'studentDetails'
                }
            },
            {
                $unwind: '$studentDetails'
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'assignee',
                    foreignField: '_id',
                    as: 'employeeDetails'
                }
            },
            {
                $unwind: '$employeeDetails'
            },
            {
                $addFields: {
                    'studentName': '$studentDetails.name',
                    'assigneeName': '$employeeDetails.name',
                    'country': '$applicationDetails.country',
                    'university': '$stepperDetails.university',
                    'program': '$stepperDetails.program',
                    'intake': '$stepperDetails.intake',
                }
            },
            {
                $project: {
                    'studentName': 1,
                    'assigneeName': 1,
                    'applicationId': 1,
                    'country': 1,
                    'university': 1,
                    'program': 1,
                    'intake': 1,
                    'stepperId': 1,
                    'stepNumber': 1,
                    'stepStatus': 1,
                }
            }

        ])

        console.log("result", result)

        res.status(200).json(result.reverse())

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })

    }
}


employeeCtrl.GetEmployeeTaskMetrics = async (req, res) => {
    const employeeId = req.params.id;

    if (!(typeof employeeId === 'string' || ObjectId.isValid(employeeId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ msg: "Employee Not Found" });

        const allTasks = await Work.find({ assignee: employee._id }).countDocuments();
        const pendingTasks = await Work.find({ assignee: employee._id, stepStatus: 'pending' }).countDocuments();
        const currentTasks = await Work.find({ assignee: employee._id, stepStatus: 'ongoing' }).countDocuments();
        const completedTasks = await Work.find({ assignee: employee._id, stepStatus: 'completed' }).countDocuments();

        const result = [
            { name: "All", value: allTasks },
            { name: "Pending", value: pendingTasks },
            { name: "On-going", value: currentTasks },
            { name: "Completed", value: completedTasks },
        ]

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}

employeeCtrl.GetMyProjectTasks = async (req, res) => {
    const employeeId = req.params.id;

    if (!employeeId) return res.status(400).json({ msg: "Invalid Employee Id" });

    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ msg: "Employee Not Found" });

        const currentTasks = employee.currentTasks;

        const result = await Task.aggregate([
            { $match: { _id: { $in: [...currentTasks] } } },
            {
                $lookup: {
                    from: "comments",
                    localField: "comments",
                    foreignField: "_id",
                    as: "commentsDetails"
                }
            },
            {
                $group: {
                    _id: "$projectId",
                    tasks: { $push: "$$ROOT" }
                }
            },
            {
                $lookup: {
                    from: "projects",
                    localField: "_id",
                    foreignField: "_id",
                    as: "projectDetails"
                }
            },
            {
                $sort: { _id: 1 }
            }

        ])

        res.status(200).json(result.reverse())

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}

employeeCtrl.WorkAssign = async (req, res) => {
    const { applicationId, employeeId, stepperId, stepNumber } = req.body;

    console.log(applicationId, employeeId, stepperId, stepNumber)

    if (!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    };

    if (!(typeof employeeId === 'string' || ObjectId.isValid(employeeId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    };

    try {
        // Check if work already exists;
        const existWork = await Work.findOne({
            applicationId: new ObjectId(applicationId),
            stepperId: new ObjectId(stepperId),
            assignee: new ObjectId(employeeId),
            stepNumber,
        })

        if (existWork) return res.status(400).json({ msg: "Already Assigned" })


        const application = await Application.findById(applicationId);
        if (!application) return res.status(404).json({ msg: "Application not found" });

        if (application.phase === "completed" || application.phase === "cancelled") return res.status(404).json({ msg: "Inactive Application" });

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ msg: "Employee not found" });


        //Update the assignee and status in that particular step

        const modifiedStepper = await Stepper.findOneAndUpdate({ _id: new ObjectId(stepperId), steps: { $elemMatch: { _id: stepNumber } } },
            { $set: { 'steps.$.assignee': employee._id, 'steps.$.status': "pending" } }, { new: true }
        );

        const applicationStatus = modifiedStepper?.steps[stepNumber - 1]?.name;


        await Application.findByIdAndUpdate(application._id, {
            $push: { statuses: applicationStatus, assignees: employee._id }
        })


        const newWork = new Work({
            applicationId: application._id,
            stepperId: new ObjectId(stepperId),
            studentId: application.studentId,
            assignee: employee._id,
            stepNumber,
            stepStatus: "pending"
        })

        console.log("newWork", newWork)

        await newWork.save();

        res.status(200).json({ msg: "Work Assigned", modifiedStepper })
    } catch (error) {
        res.status(500).json({ msg: "Something went Wrong" })

    }
}


employeeCtrl.SelectEmployee = async (req, res) => {
    try {
        const employee = await Employee.find({ department: { $in: ["counselling", "registration"] } });
        console.log(employee)

        if (!employee) return res.status(404).json({ msg: "Employee Not Found" });

        res.status(200).json({employee})

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Something went Wrong" })
    }
}


module.exports = employeeCtrl;