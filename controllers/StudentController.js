const Student = require("../models/StudentModel")
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const isValidObjectId = mongoose.isValidObjectId
const studentCtrl = {};
const Application = require("../models/ApplicationModel");
const Employee = require("../models/EmployeeModel");

//Create Student;

studentCtrl.CreateStudent = async (req, res) => {

    const { name, email, password, phone,
        birthDate, age, qualification,
        address, office } = req.body;

    console.log(req.body);
    console.log("address", req.body.address);

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

            const alreadyExists = await Student.findOne({ email }).lean();
            if (alreadyExists) {
                return res.status(400).json({ msg: "Student already exists" })
            }
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newDocument = new Student({
            name, email,
            password: hashedPassword,
            phone, birthDate, age,
            qualification, address, image, office
        });

        const savedDoc = await newDocument.save();
        console.log("Saved Student", savedDoc);

        res.status(200).json({ msg: "New Student created" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Something went wrong" });
    }
}

//Get All Students;

studentCtrl.GetAllStudents = async (req, res) => {
    const name = req.query.name;
    const office = req.query.office;
    const qualification = req.query.qualification;
    const appstatus = req.query.appstatus;

    //search query;
    const searchQuery = req.query.search;

    // Paginators
    const page = req.query.page;
    const entries = req.query.entries;

    const ORArray = [{ name: { $regex: new RegExp(searchQuery, "i") } },
    { email: { $regex: new RegExp(searchQuery, "i") } },
    { qualification: { $regex: new RegExp(searchQuery, "i") } }];

    if (ObjectId.isValid(searchQuery)) {
        ORArray.push({ _id: new ObjectId(searchQuery) }, { applicationId: new ObjectId(searchQuery) })
    }

    let filters = {
        $or: [...ORArray],
        name: { $regex: new RegExp(name, "i") },
        office: { $regex: new RegExp(office, "i") },
        qualification: { $regex: new RegExp(qualification, "i") },
        isActive: true,
    }

    if (appstatus) {
        const applications = await Application.find({}, { _id: 0, studentId: 1 })
        const appliedStudents = applications.map((app) => app.studentId)

        if (appstatus === 'present') {

            filters._id = { $in: appliedStudents }
        }
        else if (appstatus === 'absent') {

            filters._id = { $nin: appliedStudents }

        }
    }

    // console.log("filters", filters)

    try {
        const allStudents = await Student.find({ ...filters }, { password: 0 });
        // console.log(allStudents);

        let result = allStudents.reverse();

        if (page) {
            if (entries) {
                result = result.slice(((page - 1) * entries), (page * entries))
            } else {
                result = result.slice(((page - 1) * 10), (page * 10))
            }
        }


        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" });
    }
}

//Get A Student;

studentCtrl.GetStudent = async (req, res) => {
    const stdtId = req.params.id;

    if (!(typeof stdtId === 'string' || ObjectId.isValid(stdtId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const student = await Student.findById(stdtId, { password: 0 });
        console.log(student);

        if (!student) return res.status(404).json({ msg: "Student not found" });

        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" });
    }
}

//Update Student;

studentCtrl.UpdateStudent = async (req, res) => {
    console.log(req.body);
    const studentId = req.params.id;
    const updates = req.body;

    if (!(typeof studentId === 'string' || ObjectId.isValid(studentId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {


        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ msg: "Student not found" });

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

        const updatedDocument = await Student.findByIdAndUpdate(studentId, {
            $set: updates
        }, { new: true });

        console.log("updatedDoc", updatedDocument)

        res.status(200).json({ msg: "Student Updated" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Something went wrong" });
    }
}


//Change Password; 

studentCtrl.ChangePassword = async (req, res) => {
    const stdtId = req.body.studentId;
    const password = req.body.password;

    if (!(typeof stdtId === 'string' || ObjectId.isValid(stdtId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const student = await Student.findById(stdtId);
        if (!student) return res.status(404).json({ msg: "Student not found" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Student.findByIdAndUpdate(stdtId, {
            $set: { password: hashedPassword }
        })

        res.status(200).json({ msg: "Password changed" });
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}


studentCtrl.GetMyApplication = async (req, res) => {
    const applicationId = req.params.id;

    if (!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const resultArray = await Application.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(applicationId)
                }
            },
            {
                $lookup: {
                    from: "students",
                    localField: "studentId",
                    foreignField: "_id",
                    as: "student"
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "assignees",
                    foreignField: "_id",
                    as: "assignee"
                }
            },
            {
                $lookup: {
                    from: "steppers",
                    localField: "_id",
                    foreignField: "applicationId",
                    as: "steppers"
                }
            },
            {
                $unwind: "$student"
            },
            {
                $unwind: "$assignee"
            },
            {
                $project: {
                    _id: 1,
                    studentId: 1,
                    intakes: 1,
                    country: 1,
                    creator: 1,
                    status: 1,
                    assignees: 1,
                    documents: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    studentName: "$student.name",
                    assignee: "$assignee.name",
                    steppers: 1
                }
            }
        ]);

        if (!resultArray.length) return res.status(404).json({ msg: "Application doesn't exist" });

        const statusArray = [];

        for (const stepper of resultArray[0].steppers) {
            const checkObj = {};
            const minStatusArr = [];

            for (const step of stepper.steps) {

                const relatives = stepper.steps.filter((elem) => elem.groupStatus === step.groupStatus);

                checkObj[step.groupStatus] = relatives.every((elem) => elem.status === "completed");
            }


            for (const obj in checkObj) {
                if (checkObj[obj]) {
                    minStatusArr.push({ [obj]: "completed" })
                } else {
                    minStatusArr.push({ [obj]: "incomplete" })

                }
            }

            statusArray.push({ university: stepper.university, partnership: stepper.partnership, arrayForMapping: minStatusArr })

        }

        const { steppers, ...result } = resultArray[0];

        res.status(200).json({ result, statusArray });
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" });
    }
};


studentCtrl.GetAllOfMyApplications = async (req, res) => {
    const studentId = req.params.id;

    if (!(isValidObjectId(studentId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {

        const resultArray = await Application.find({ studentId: new ObjectId(studentId) })

        res.status(200).json(resultArray.reverse());
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" });
    }
};


studentCtrl.DeactivateStudent = async (req, res) => {
    const studentId = req.params.id;

    if (!(typeof studentId === 'string' || ObjectId.isValid(studentId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ msg: "Student not found" });

        await Student.findByIdAndUpdate(studentId, {
            $set: { isActive: false }
        });

        res.status(200).json({ msg: "Student deleted" })
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}


// followups from student collection itself ;

studentCtrl.getSingleFollowup = async (req, res) => {

    try {
        const stdId = req.params.id;

        const followups = await Student.aggregate([
            { $match: { '_id': new ObjectId(stdId) } },
            {
                $lookup: {
                    from: 'applications',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'applications'
                }
            },
            {
                $match: {
                    'applications': { $size: 0 }
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'assignee',
                    foreignField: '_id',
                    as: 'assigneeDetails'
                }
            },
            {
                $lookup: {
                    from: 'datas',
                    let: { stageId: '$stage' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$name', 'stage'] } } },
                        { $unwind: '$list' },
                        { $match: { $expr: { $eq: ['$list._id', '$$stageId'] } } },
                        { $project: { 'list.label': 1, 'list._id': 1 } }
                    ],
                    as: 'stageDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    phone: 1,
                    email: 1,
                    assignee: 1,
                    assigneeName: { $arrayElemAt: ['$assigneeDetails.name', 0] },
                    stage: 1,
                    stageName: { $arrayElemAt: ['$stageDetails.list.label', 0] },
                    communication: 1,
                }
            },

        ]);

        console.log(followups);

        // in frontend match the _ids in communication array with their labels in redux store


        res.status(200).json({ followup: followups[0] ?? {} })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Something went wrong' })
    }
}

studentCtrl.getFollowups = async (req, res) => {
    try {

        const { stage } = req.query

        // Paginators
        const page = req.query.page;
        const entries = req.query.entries;

        let filters = {};

        if (stage && isValidObjectId(stage)) {
            filters.stage = new ObjectId(stage)
        }

        const followups = await Student.aggregate([
            {
                $lookup: {
                    from: 'applications',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'applications'
                }
            },
            {
                $match: {
                    'applications': { $size: 0 }
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'assignee',
                    foreignField: '_id',
                    as: 'assigneeDetails'
                }
            },
            {
                $lookup: {
                    from: 'datas',
                    let: { stageId: '$stage' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$name', 'stage'] } } },
                        { $unwind: '$list' },
                        { $match: { $expr: { $eq: ['$list._id', '$$stageId'] } } },
                        { $project: { 'list.label': 1, 'list._id': 1 } }
                    ],
                    as: 'stageDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    phone: 1,
                    email: 1,
                    assignee: 1,
                    assigneeName: { $arrayElemAt: ['$assigneeDetails.name', 0] },
                    stage: 1,
                    stageName: { $arrayElemAt: ['$stageDetails.list.label', 0] },
                    communication: 1,
                }
            },

            {
                $match: {
                    ...filters
                }
            }

        ]);

        console.log(followups);

        // in frontend match the ObjectIds in communication array with their labels in redux store

        let result = followups;

        if (page) {
            if (entries) {
                result = result.slice(((page - 1) * entries), (page * entries))
            } else {
                result = result.slice(((page - 1) * 10), (page * 10))
            }
        }

        res.status(200).json({ followups: result })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Something went wrong' })
    }
}


studentCtrl.updateFollowup = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignee, stage, communication = [] } = req.body;

        const updateObj = {}

        if (assignee && isValidObjectId(assignee)) {
            const assigneeExists = await Employee.findById(assignee)

            if (assigneeExists) {
                updateObj.assignee = assignee
            }
        }

        if (stage && isValidObjectId(stage)) {
            updateObj.stage = stage;
        }

        if (communication?.length) {
            const altCommn = communication.filter((obj) => isValidObjectId(obj))

            updateObj.communication = altCommn;
        }

        const updatedStudent = await Student.findByIdAndUpdate(id, {
            $set: updateObj
        }, { new: true })

        if (!updatedStudent) { return res.status(404).json({ msg: "Followup not found" }) }

        const followup = {
            _id: updatedStudent?._id,
            name: updatedStudent?.name,
            email: updatedStudent?.email,
            phone: updatedStudent?.phone,
            assignee: updatedStudent?.assignee,
            communication: updatedStudent?.communication,
            stage: updatedStudent?.stage,

        }

        res.status(200).json({ msg: "Followup updated", followup })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Something went wrong' })
    }
}

module.exports = studentCtrl;
