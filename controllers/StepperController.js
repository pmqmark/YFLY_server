const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Stepper = require("../models/StepperModel");
const Application = require("../models/ApplicationModel");
const partneredData = require("../datas/partnered.json");
const nonPartneredData = require("../datas/non-partnered.json");
const Work = require("../models/WorkModel");
const Employee = require("../models/EmployeeModel");

const stepCtrl = {}

// Create a Step;
stepCtrl.CreateAStepper = async (req, res) => {
    const { applicationId, through, intake, program, university, partnership, assignee } = req.body;

    try {

        const application = await Application.findById(applicationId);
        if (!application) return res.status(404).json({ msg: "Application not found" })

        let currentSteps = [];

        if (partnership === "partnered") {
            currentSteps = partneredData.filter((step) => {
                return (step.country === "common" || step.country === country)
            })
        }
        else if (partnership === "non-partnered") {
            currentSteps = [...nonPartneredData]
        }

        if ((typeof assignee === "string" || ObjectId.isValid(assignee))) {
            currentSteps = currentSteps.map((step) => {
                if (step._id === 1) {
                    return { ...step, status: "pending", assignee: new ObjectId(assignee) }
                }

                return step
            });
        }

        const newStepper = new Stepper({
            applicationId: new ObjectId(applicationId),
            through,
            intake,
            program,
            university,
            steps: currentSteps
        });

        const savedStepper = await newStepper.save();

        if (assignee) {
            const newWork = new Work({
                applicationId: application._id,
                stepperId: savedStepper._id,
                studentId: application.studentId,
                assignee: new ObjectId(assignee),
                stepNumber: 1,
                stepStatus: "pending"
            })

            console.log("newWork", newWork)

            const savedWork = await newWork.save();

           
        }

        if (application?.assignees?.includes(new ObjectId(assignee))) {
            await Application.findByIdAndUpdate(savedStepper.applicationId, {
                $push: { steppers: savedStepper._id, intakes: intake, statuses: savedStepper?.steps[0]?.name }
            })

        } else {
            await Application.findByIdAndUpdate(savedStepper.applicationId, {
                $push: { steppers: savedStepper._id, intakes: intake, statuses: savedStepper?.steps[0]?.name, assignees: new ObjectId(assignee) }
            })

        }


        res.status(200).json(savedStepper);

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" });
    }


}

// Get One Steps Document;
stepCtrl.GetSingleStepper = async (req, res) => {
    const stepperId = req.params.id;

    if (!(typeof stepperId === 'string' || ObjectId.isValid(stepperId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {

        const pipeline = [
            {
                $match: {
                    _id: new ObjectId(stepperId)
                }
            },
            {
                $unwind: "$steps"
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "steps.assignee",
                    foreignField: "_id",
                    as: "assigneeInfo"
                }
            },
            {
                $unwind: {
                    path: "$assigneeInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    "steps.assigneeName": "$assigneeInfo.name"
                }
            },
            {
                $group: {
                    _id: "$_id",
                    applicationId: { $first: "$applicationId" },
                    through: { $first: "$through" },
                    intake: { $first: "$intake" },
                    program: { $first: "$program" },
                    university: { $first: "$university" },
                    partnership: { $first: "$partnership" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    steps: { $push: "$steps" },
                }
            }
        ];


        const stepperDoc = await Stepper.aggregate(pipeline);

        console.log(stepperDoc[0]);
        if (!stepperDoc[0]) return res.status(404).json({ msg: "Stepper Document not found" });

        res.status(200).json(stepperDoc[0])
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}

// Get All Steps in an application
stepCtrl.GetAllSteppers = async (req, res) => {
    const applicationId = req.params.id;

    if (!(typeof applicationId === 'string' || ObjectId.isValid(applicationId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const application = await Application.findById(applicationId);
        console.log(application);
        if (!application) return res.status(404).json({ msg: "Application not found" });

        const steppers = await Stepper.find({ applicationId: application._id })

        res.status(200).json(steppers)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })

    }

}


// Update Steps Note: Here if assignee is not present in a step on updation 

stepCtrl.updateStepper = async (req, res) => {
    const { stepperId, stepNumber, stepStatus, stepAssignee } = req.body;

    if (!(typeof stepperId === 'string' || ObjectId.isValid(stepperId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        let stepperDoc = await Stepper.findById(stepperId);
        console.log(stepperDoc);
        if (!stepperDoc) return res.status(404).json({ msg: "Step Document not found" });

        const application = await Application.findById(stepperDoc.applicationId)
        if (!application) return res.status(404).json({ msg: "Application not found" })

        const assigneeExists = stepperDoc.steps.find((step) => step._id === stepNumber && step.assignee !== undefined)
        if (!assigneeExists) return res.status(404).json({ msg: "Cannot update before assigning" })

        if (stepNumber) {
            if (stepStatus) {

                stepperDoc = await Stepper.findOneAndUpdate({ _id: stepperId, 'steps': { $elemMatch: { _id: stepNumber } } },
                    { $set: { 'steps.$.status': stepStatus } }, { new: true }
                )


                const applicationStatus = stepperDoc?.steps[stepNumber - 1]?.name;
                const currentAssignee = stepperDoc?.steps[stepNumber - 1]?.assignee;

                if (stepStatus === "pending" || stepStatus === "ongoing") {
                    await Application.findByIdAndUpdate(application._id, {
                        $push: { statuses: applicationStatus },
                        $set: { phase: "ongoing" }
                    })
                }

                if (stepStatus === "completed") {
                    const oldArray = application?.statuses
                    const index = oldArray?.findIndex((status) => status === applicationStatus)
                    const newStatuses = oldArray?.filter((status, i) => i !== index)

                    await Application.findByIdAndUpdate(application._id, {
                        $pull: { assignees: currentAssignee },
                        $set: { statuses: newStatuses }
                    })
                }
            }

        }

        await Work.findOneAndUpdate({
            applicationId: application._id,
            stepperId: new ObjectId(stepperId),
            assignee: new ObjectId(stepAssignee),
            stepNumber
        },
            { $set: { stepStatus: stepStatus } }
        );


        res.status(200).json(stepperDoc)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}


//Delete steps
stepCtrl.DeleteAStepper = async (req, res) => {
    const stepperId = req.params.id;

    if (!(typeof stepperId === 'string' || ObjectId.isValid(stepperId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const stepperDoc = await Stepper.findById(stepperId);
        console.log(stepperDoc);
        if (!stepperDoc) return res.status(404).json({ msg: "Step not found" });

        await Stepper.findByIdAndDelete(stepperDoc._id);

        await Application.findByIdAndUpdate(stepperDoc.applicationId, {
            $pull: { steppers: stepperDoc._id }
        })


        await Work.deleteMany({ stepperId: new ObjectId(stepperId) })

        res.sendStatus(204)
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }

}

module.exports = stepCtrl;
