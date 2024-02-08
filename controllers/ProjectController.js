const Comment = require("../models/CommentModel");
const Employee = require("../models/EmployeeModel");
const Project = require("../models/ProjectModel");
const Task = require("../models/TaskModel");
const ObjectId = require("mongoose").Types.ObjectId;
const projectCtrl = {}

// Create project
projectCtrl.CreateProject = async (req, res) => {
    const { name, startDate,
        endDate, members } = req.body;

    console.log(name, startDate,
        endDate, members)

    const membersArray = members?.map((member) => new ObjectId(member))

    const schemaObject = {
        name,
        startDate,
        endDate,
        members: membersArray
    }

    try {
        const newDoc = new Project(schemaObject);

        const savedDoc = await newDoc.save();

        res.status(200).json(savedDoc);

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}


// Get all projects
projectCtrl.GetAllProjects = async (req, res) => {

    // Paginators
    const page = req.query.page;
    const entries = req.query.entries;


    try {

        const allProjects = await Project.aggregate([
            {
                $unwind: { path: "$tasks", preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: "tasks",
                    localField: "tasks",
                    foreignField: "_id",
                    as: "taskDetails"
                }
            },
            {
                $unwind: { path: "$taskDetails", preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "members",
                    foreignField: "_id",
                    as: "memberDetails"
                }
            },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    status: { $first: "$status" },
                    startDate: { $first: "$startDate" },
                    endDate: { $first: "$endDate" },
                    members: { $first: "$memberDetails._id" },
                    tasks: { $push: "$taskDetails" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ])

        let result = allProjects.reverse();

        if (page) {
            if (entries) {
                result = result.slice(((page - 1) * entries), (page * entries))
            } else {
                result = result.slice(((page - 1) * 10), (page * 10))
            }
        } 
        

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" });
    }
}

// Get a project;
projectCtrl.GetProject = async (req, res) => {
    const projectId = req.params.id;

    if (!(typeof projectId === 'string' || ObjectId.isValid(projectId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const projectArray = await Project.aggregate([
            { $match: { _id: new ObjectId(projectId) } },
            {
                $unwind: {
                    path: "$tasks",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "tasks",
                    localField: "tasks",
                    foreignField: "_id",
                    as: "taskDetails"
                }
            },
            {
                $unwind: {
                    path: "$taskDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "members",
                    foreignField: "_id",
                    as: "memberDetails"
                }
            },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    status: { $first: "$status" },
                    startDate: { $first: "$startDate" },
                    endDate: { $first: "$endDate" },
                    members: { $first: "$memberDetails._id" },
                    tasks: { $push: "$taskDetails" }
                }
            }
        ])

        const result = projectArray[0]

        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}

projectCtrl.UpdateProject = async (req, res) => {
    const { projectId, name, status, startDate,
        endDate } = req.body;

    if (!(typeof projectId === 'string')) {
        return res.status(400).json({ msg: "Invalid id" })
    }

    const updates = {};

    if (name) { updates.name = name }
    if (status) { updates.status = status }
    if (startDate) { updates.startDate = startDate }
    if (endDate) { updates.endDate = endDate }

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(400).json({ msg: "Project not found" });

        const updatedProject = await Project.findByIdAndUpdate(project._id, {
            $set: updates
        }, { new: true });

        res.status(200).json(updatedProject)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}


// Delete project
projectCtrl.DeleteProject = async (req, res) => {
    const projectId = req.params.id;

    if (!(typeof projectId === 'string' || ObjectId.isValid(projectId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const project = await Project.findById(projectId);

        if (!project) return res.status(404).json({ msg: "Project doesn't exist" })

        const relatedTasks = await Task.find({ projectId: project._id })

        relatedTasks?.forEach(async (task) => {
            return (
                await Employee.findByIdAndUpdate(task.assignee, {
                    $pull: { currentTasks: task._id }
                })
            )
        })

        await Project.findByIdAndDelete(projectId);
        res.sendStatus(204)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}



// TASK METHODS

// Add a Task 
projectCtrl.AddTask = async (req, res) => {
    const { projectId, assignee, taskName } = req.body;

    if (!(typeof projectId === 'string' || typeof assignee === 'string' || typeof taskName === 'string')) {
        return res.status(400).json({ msg: "Invalid format" });
    }
    try {

        const project = await Project.findById(projectId);
        if (!project) return res.status(400).json({ msg: "Project not found" });

        const employee = await Employee.findById(assignee);
        if (!employee) return res.status(400).json({ msg: "employee not found" })

        const task = await Task.create({
            projectId: new ObjectId(projectId),
            assignee: new ObjectId(assignee),
            taskName
        })

        await Project.findByIdAndUpdate(project._id, {
            $push: { tasks: task._id }
        })

        const membersArray = project?.members;

        if (!membersArray.includes(employee._id)) {
            await Project.findByIdAndUpdate(project._id, {
                $push: { members: employee._id }
            })
        }

        const currentTasks = employee?.currentTasks;

        if (!currentTasks.includes(task._id)) {
            await Employee.findByIdAndUpdate(employee._id, {
                $push: { currentTasks: task._id }
            })
        }

        res.status(200).json(task)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })

    }

}

// Get all the tasks of a project
projectCtrl.GetAllTasksOfAProject = async (req, res) => {
    const projectId = req.params.id;

    if (!(typeof projectId === 'string' || ObjectId.isValid(projectId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {

        const taskArray = await Task.aggregate([
            {
                $match: { projectId: new ObjectId(projectId) }
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
                $unwind: "$assigneeDetails"
            },
            {
                $lookup: {
                    from: "projects",
                    localField: "projectId",
                    foreignField: "_id",
                    as: "projectDetails"
                }
            },
            {
                $unwind: "$projectDetails"
            },
            {
                $lookup: {
                    from: "comments",
                    localField: "comments",
                    foreignField: "_id",
                    as: "commentsDetails"
                }
            },
            {
                $addFields: {
                    'assigneeName': "$assigneeDetails.name",
                    "projectName": '$projectDetails.name',
                    "startDate": '$projectDetails.startDate',
                    "endDate": '$projectDetails.endDate',
                    "status": '$projectDetails.status',
                }
            },
            {
                $project: {
                    projectId: 1,
                    assignee: 1,
                    taskName: 1,
                    taskStatus: 1,
                    'assigneeName': 1,
                    "projectName": 1,
                    "startDate": 1,
                    "endDate": 1,
                    "status": 1,
                    comments: { $ifNull: ["$commentsDetails", []] },
                }
            },
            {
                $group: {
                    _id: "$assignee",
                    assigneeName: { $first: "$assigneeName" },
                    tasks: { $push: "$$ROOT" },
                }
            },
            {
                $sort: { "_id": 1 }
            },
        ]);


        res.status(200).json(taskArray.reverse())
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}

// Get a task of a project
projectCtrl.GetATaskOfAProject = async (req, res) => {
    // const projectId = req.params.id;
    const taskId = req.params.id;

    if (!(typeof taskId === 'string' || ObjectId.isValid(taskId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {

        const taskArray = await Task.aggregate([
            {
                $match: { _id: new ObjectId(taskId) }
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
                $unwind: "$assigneeDetails"
            },
            {
                $lookup: {
                    from: "projects",
                    localField: "projectId",
                    foreignField: "_id",
                    as: "projectDetails"
                }
            },
            {
                $unwind: "$projectDetails"
            },
            {
                $addFields: {
                    'assigneeName': "$assigneeDetails.name",
                    "projectName": '$projectDetails.name',
                    "startDate": '$projectDetails.startDate',
                    "endDate": '$projectDetails.endDate',
                    "status": '$projectDetails.status',
                }
            },
            {
                $unwind: {
                    path: "$comments",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "comments",
                    localField: "comments",
                    foreignField: "_id",
                    as: "commentsDetails"
                }
            },
            {
                $unwind: {
                    path: "$commentsDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: "$_id",
                    assignee: { $first: "$assignee" },
                    taskName: { $first: "$taskName" },
                    taskStatus: { $first: "$taskStatus" },
                    'assigneeName': { $first: "$assigneeName" },
                    "projectName": { $first: "$projectName" },
                    "startDate": { $first: "$startDate" },
                    "endDate": { $first: "$endDate" },
                    "status": { $first: "$status" },
                    comments: { $push: "$commentsDetails" },
                }
            },
        ]);

        const result = taskArray[0]

        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}

// Update Task Status;
projectCtrl.ChangeTaskStatus = async (req, res) => {
    const { taskId, taskStatus } = req.body;

    if (!(typeof taskId === 'string' || ObjectId.isValid(taskId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ msg: "task doesn't exist" })

        const project = await Project.findById(task.projectId);
        if (!project) return res.status(404).json({ msg: "Project doesn't exist" });

        const employee = await Employee.findById(task.assignee)
        if (!employee) res.status(404).json({ msg: "Employee not found" })

        const updatedTask = await Task.findByIdAndUpdate(taskId,
            { $set: { taskStatus: taskStatus } }, { new: true }
        );

        const relatedTasks = await Task.find({ projectId: project._id })

        let isOngoing = relatedTasks.some((task) => {
            return task.taskStatus === "ongoing"
        })

        if (isOngoing) {
            await Project.findByIdAndUpdate(project._id,
                { $set: { status: "ongoing" } }, { new: true }
            )
        } else {
            let isCompleted = relatedTasks.every((task) => {
                return task.taskStatus === "completed"
            })

            if (isCompleted) {
                await Project.findByIdAndUpdate(project._id,
                    { $set: { status: "completed" } }, { new: true }
                )
            };

        }

        //If Status eq completed Remove the project id from employee's currentTasks array

        if (taskStatus === "completed") {
            await Employee.findByIdAndUpdate(employee._id, {
                $pull: { currentTasks: task._id }
            })
        }

        console.log(updatedTask)

        res.status(200).json(updatedTask);

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}

// Rework the Task (from Admin)
projectCtrl.ReworkTask = async (req, res) => {
    const taskId = req.params.id;

    if (!(typeof taskId === 'string' || ObjectId.isValid(taskId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ msg: "task doesn't exist" })

        const project = await Project.findById(task.projectId);
        if (!project) return res.status(404).json({ msg: "Project doesn't exist" });

        const employee = await Employee.findById(task.assignee)
        if (!employee) res.status(404).json({ msg: "Employee not found" })

        const reworkingTask = await Task.findByIdAndUpdate(taskId,
            { $set: { taskStatus: "pending" } }, { new: true }
        );

        const relatedTasks = await Task.find({ projectId: project._id })

        let isOngoing = relatedTasks.some((task) => {
            return task.taskStatus === "ongoing"
        })

        if (isOngoing) {
            await Project.findByIdAndUpdate(project._id,
                { $set: { status: "ongoing" } }, { new: true }
            )
        } else {
            let someCompleted = relatedTasks.some((task) => {
                return task.taskStatus === "completed"
            })

            if (!someCompleted) {
                await Project.findByIdAndUpdate(project._id,
                    { $set: { status: "pending" } }, { new: true }
                )
            } else {
                await Project.findByIdAndUpdate(project._id,
                    { $set: { status: "ongoing" } }, { new: true }
                )
            }
        }

        const taskAlreadyExists = employee.currentTasks.includes(task._id);

        if (!taskAlreadyExists) {
            await Employee.findByIdAndUpdate(employee._id, {
                $push: { currentTasks: task._id }
            })
        }

        console.log(reworkingTask)

        res.status(200).json(reworkingTask);

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}



// Update Task;
projectCtrl.UpdateTask = async (req, res) => {
    const taskId = req.params.id;
    const { taskStatus, comment } = req.body;
    const resourceId = taskId;
    const resourceType = "task"
    const commentorId = req.user.userId;
    const fromAdmin = req.user.role === "admin";


    if (!(typeof taskId === 'string' || ObjectId.isValid(taskId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ msg: "task doesn't exist" })

        const project = await Project.findById(task.projectId);
        if (!project) return res.status(404).json({ msg: "Project doesn't exist" });

        const employee = await Employee.findById(task.assignee)
        if (!employee) res.status(404).json({ msg: "Employee not found" })

        let updatedTask;
        if (taskStatus) {
            updatedTask = await Task.findByIdAndUpdate(taskId,
                { $set: { taskStatus: taskStatus } }, { new: true }
            );


            const relatedTasks = await Task.find({ projectId: project._id })

            let isOngoing = relatedTasks.some((task) => {
                return task.taskStatus === "ongoing"
            })

            if (isOngoing) {
                await Project.findByIdAndUpdate(project._id,
                    { $set: { status: "ongoing" } }, { new: true }
                )
            } else {
                let isCompleted = relatedTasks.every((task) => {
                    return task.taskStatus === "completed"
                })

                if (isCompleted) {
                    await Project.findByIdAndUpdate(project._id,
                        { $set: { status: "completed" } }, { new: true }
                    )
                };

            }

            //If Status eq completed Remove the project id from employee's currentTasks array

            if (taskStatus === "completed") {
                await Employee.findByIdAndUpdate(employee._id, {
                    $pull: { currentTasks: task._id }
                })
            }

        }


        if (comment) {
            const newComment = new Comment({
                resourceId: new ObjectId(resourceId),
                resourceType,
                commentorId: new ObjectId(commentorId),
                comment: comment.trim(),
                fromAdmin
            });

            const savedComment = await newComment.save();
            console.log(savedComment);

            updatedTask = await Task.updateOne({ _id: new ObjectId(resourceId) },
                { $push: { comments: savedComment._id } },
                { new: true }
            )
        }
        console.log(updatedTask)

        res.status(200).json(updatedTask);

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}



// Delete Task =>
projectCtrl.DeleteATask = async (req, res) => {
    const taskId = req.params.id;

    if (!taskId) return res.status(400).json({ msg: "Invalid Task id format" })


    try {
        const task = await Task.findById(taskId);
        if (!task) return res.status(400).json({ msg: "Task not found" });

        await Task.findByIdAndDelete(task._id)

        await Project.findByIdAndUpdate(task.projectId, {
            $pull: { tasks: task._id, members: task.assignee }
        })

        await Employee.findByIdAndUpdate(task.assignee, {
            $pull: { currentTasks: task._id }
        })

        await Comment.deleteMany({ resourceId: task._id })

        res.sendStatus(204)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}


projectCtrl.GetMembers = async (req, res) => {
    const projectId = req.params.id;

    if (!(typeof projectId === 'string')) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(400).json({ msg: "Project not found" })

        const members = project?.members || [];
        console.log("members", members)

        const result = await Employee.find({ _id: { $in: members } }, { password: 0 })

        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}

module.exports = projectCtrl;
