const Student = require("../models/StudentModel")
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const isValidObjectId = mongoose.isValidObjectId
const studentCtrl = {};
const Application = require("../models/ApplicationModel");
const Employee = require("../models/EmployeeModel");
const Followup = require("../models/FollowupModel");

//Create Student;

studentCtrl.CreateStudent = async (req, res) => {

    const { name, email, password, phone,
        birthDate, age, qualification,
        address, office, enquiryRoute, assignee } = req.body;

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
            qualification, address, image, office, enquiryRoute
        });

        const student = await newDocument.save();
        console.log("Saved Student", student);

        if (!student) { return res.status(400).json({ msg: 'Failed to register' }) }

        if (assignee) {
            const createObj = {
                assignee: new ObjectId(assignee),
                studentId: student?._id
            }

            const followupDoc = await Followup.create(createObj)
            console.log({ followupDoc })
        }


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
    const appstatus = req.query.appstatus;

    //search query;
    const searchQuery = req.query.search;

    // Paginators
    const page = req.query.page;
    const entries = req.query.entries;

    const ORArray = [
        { name: { $regex: new RegExp(searchQuery, "i") } },
        { email: { $regex: new RegExp(searchQuery, "i") } },
        { enquiryRoute: { $regex: new RegExp(searchQuery, "i") } },
    ];

    if (ObjectId.isValid(searchQuery)) {
        ORArray.push({ _id: new ObjectId(searchQuery) }, { applicationId: new ObjectId(searchQuery) })
    }

    let filters = {
        $or: [...ORArray],
        name: { $regex: new RegExp(name, "i") },
        office: { $regex: new RegExp(office, "i") },
        isActive: true,
    }

    if (appstatus) {
        const applications = await Application.find({}, { _id: 0, studentId: 1 })
        const appliedStudents = applications.map((app) => isValidObjectId(app.studentId) && new ObjectId(app.studentId))

        if (appstatus === 'present') {

            filters._id = { $in: appliedStudents }
        }
        else if (appstatus === 'absent') {

            filters._id = { $nin: appliedStudents }

        }
    }

    try {

        const allStudents = await Student.aggregate([
            {
                $lookup: {
                    from: 'followups',
                    as: 'followupdoc',
                    foreignField: 'studentId',
                    localField: '_id'
                }
            },
            {
                $unwind: {
                    path: '$followupdoc',
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: 'employees',
                    as: 'assigneeDoc',
                    foreignField: '_id',
                    localField: 'followupdoc.assignee'
                }
            },

            {
                $unwind: {
                    path: '$assigneeDoc',
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $match: { ...filters }
            },

            {
                $project: {
                    name: '$name',
                    email: '$email',
                    phone: '$phone',
                    birthDate: '$birthDate',
                    address: '$address',
                    role: '$role',
                    office: '$office',
                    enquiryRoute: '$enquiryRoute',
                    assigneeName: '$assigneeDoc.name',
                    assigneeId: '$assigneeDoc._id',
                }
            },

            {
                $sort: {
                    createdAt: -1,
                }
            }

        ])

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
    const { assigneeId, ...updates } = req.body;

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

        const updatedStudent = await Student.findByIdAndUpdate(studentId, {
            $set: updates
        }, { new: true });

        console.log("updatedDoc", updatedStudent)

        if (assigneeId) {
            const followup = await Followup.findOne({ studentId: updatedStudent?._id })

            if (followup) {
                await Followup.findByIdAndUpdate(followup?._id,
                    { $set: { assignee: new ObjectId(assigneeId) } }, { new: true }
                )
            } else {
                const createObj = {
                    assignee: new ObjectId(assigneeId),
                    studentId: student?._id
                }

                await Followup.create(createObj)
            }
        }

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
        const { studentId, assignee, stage, communication, author, contents } = req.body;

        const alterObj = {}

        if (assignee && isValidObjectId(assignee)) {
            const assigneeExists = await Employee.findById(assignee)

            if (assigneeExists) {
                alterObj.assignee = new ObjectId(assignee)
            }
        }

        if (stage && isValidObjectId(stage)) {
            alterObj.stage = new ObjectId(stage);
        }

        if (communication?.length) {
            const altCommn = communication.filter((obj) => isValidObjectId(obj))

            if (altCommn?.length) {
                alterObj.communication = altCommn?.map(item => new ObjectId(item));
            }
        } else {
            alterObj.communication = []
        }

        if (isValidObjectId(author) && contents?.length) {
            const newNotes = contents?.map(item => ({ author: new ObjectId(author), content: item?.trim() }))
            console.log(newNotes)
            alterObj.notes = newNotes
        }

        const student = await Student.findById(studentId);
        if (!student) { return res.status(404).json({ msg: "Student not found" }) }

        const followup = await Followup.findOne({ studentId: student?._id })

        let theAltered;

        if (followup) {
            const { notes, ...setterObj } = alterObj;
            console.log({ notes })
            theAltered = await Followup.findByIdAndUpdate(followup?._id,
                { $set: setterObj, $push: { notes: notes } }, { new: true }
            )
        } else {
            const createObj = {
                ...alterObj,
                studentId: student?._id
            }

            theAltered = await Followup.create(createObj)
        }

        if (!theAltered) { return res.status(404).json({ msg: "unable to update" }) }

        console.log({ theAltered })


        res.status(200).json({ msg: "Followup updated", followup: theAltered })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Something went wrong' })
    }
}

studentCtrl.getOneFollowupDoc = async (req, res) => {
    try {
        const followId = req.params.id;

        const followup = await Followup.findById(followId)
            .populate('assignee', '_id name')
            .populate('studentId', '_id name')
            .populate('notes.author', '_id name')


        // in frontend match the _ids in communication array with their labels in redux store


        res.status(200).json({ followup })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Something went wrong' })
    }
}


studentCtrl.getManyFollowupDocs = async (req, res) => {
    try {

        const { stage, assignee } = req.query
        const searchQuery = req.query.search;

        // Paginators
        const page = req.query.page;
        const entries = req.query.entries;

        const ORArray = [
            { name: { $regex: new RegExp(searchQuery, "i") } },
            { email: { $regex: new RegExp(searchQuery, "i") } },
        ];
    
        const filters = {$or: [...ORArray], isActive: true};

        if (stage && isValidObjectId(stage)) {
            filters.stage = new ObjectId(stage)
        }

        if (assignee && isValidObjectId(assignee)) {
            filters.assignee = new ObjectId(assignee)
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
                    from: 'followups',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'followups'
                }
            },
            {
                $unwind: {
                    path: '$followups',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'followups.assignee',
                    foreignField: '_id',
                    as: 'assigneeDetails'
                }
            },
            {
                $lookup: {
                    from: 'datas',
                    let: { stageId: '$followups.stage' },
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
                    isActive: 1,
                    assignee: '$followups.assignee',
                    assigneeName: { $arrayElemAt: ['$assigneeDetails.name', 0] },
                    stage: '$followups.stage',
                    stageName: { $arrayElemAt: ['$stageDetails.list.label', 0] },
                    communication: '$followups.communication',
                    followup: '$followups._id'
                }
            },

            {
                $match: {
                    ...filters
                }
            }

        ]);

        // in frontend match the ObjectIds in communication array with their labels in redux store

        let result = followups?.reverse();

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


studentCtrl.GetNamesOfAllStudents = async (req, res) => {
    const name = req.query.name;

    // Paginators
    const page = req.query.page;
    const entries = req.query.entries;

    const filters = {
        isActive: true,
    }

    if (name) { filters.name = { $regex: new RegExp(name, "i") } }

    try {

        const allStudents = await Student.find(filters, {_id:1, name:1})

        let result = allStudents.sort((a,b)=> a?.name?.trim().localeCompare(b?.name?.trim()))

        if (page) {
            if (entries) {
                result = result.slice(((page - 1) * entries), (page * entries))
            } else {
                result = result.slice(((page - 1) * 10), (page * 10))
            }
        }


        res.status(200).json({result});
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" });
    }
}

module.exports = studentCtrl;
