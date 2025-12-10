const Application = require("../models/ApplicationModel");
const Student = require("../models/StudentModel");
const mongoose = require("mongoose");
const Comment = require("../models/CommentModel");
const Employee = require("../models/EmployeeModel");
const ObjectId = mongoose.Types.ObjectId;
const {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const applicationCtrl = {};

// Prefer DigitalOcean Spaces envs if provided, fall back to AWS S3 envs
const accessKeyId = process.env.DO_SPACES_KEY || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey =
  process.env.DO_SPACES_SECRET || process.env.AWS_SECRET_ACCESS_KEY;
const endpoint = process.env.DO_SPACES_ENDPOINT || null; // e.g. https://blr1.digitaloceanspaces.com or https://yfly.blr1.digitaloceanspaces.com
const region = process.env.S3_REGION || "us-east-1";
const Bucket = process.env.DO_SPACES_BUCKET || process.env.S3_BUCKET;

const s3Client = new S3Client({
  region,
  endpoint: endpoint || undefined,
  forcePathStyle: true, // safer for custom endpoints (DigitalOcean Spaces)
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const partneredData = require("../datas/partnered.json");
const nonPartneredData = require("../datas/non-partnered.json");
const Work = require("../models/WorkModel");
const Stepper = require("../models/StepperModel");

//Create Application;

applicationCtrl.CreateApplication = async (req, res) => {
  const { studentId, uniBased, country, creator, assignee } = req.body;

  if (!(typeof studentId === "string" || ObjectId.isValid(studentId))) {
    return res.status(400).json({ msg: "Invalid Id format" });
  }

  //typeof uniBased = [{through,intake,program,university,partnership}]

  let steppers = [];
  let statuses = [];
  let intakes = [];
  let assignees = [];

  let schemaObject = {
    studentId: new ObjectId(studentId),
    country,
    creator: new ObjectId(creator),
    steppers,
    statuses,
    intakes,
    assignees,
  };

  try {
    const student = await Student.findById(studentId);
    console.log(student);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    const newDocument = new Application(schemaObject);

    const application = await newDocument.save();
    console.log("application", application);

    if (!Array.isArray(uniBased)) {
      return res.status(400).json({ msg: "Incomplete data about university" });
    }

    // Creating parallel steps according to the universities;
    for (const obj of uniBased) {
      let currentSteps = [];

      if (obj.partnership === "partnered") {
        currentSteps = partneredData.filter((step) => {
          return step.country === "common" || step.country === country;
        });
      } else if (obj.partnership === "non-partnered") {
        currentSteps = nonPartneredData.filter((step) => {
          return step.country === "common" || step.country === country;
        });
      }

      if (assignee) {
        currentSteps = currentSteps.map((step) => {
          if (step._id === 1) {
            return {
              ...step,
              status: "pending",
              assignee: new ObjectId(assignee),
            };
          }

          return step;
        });
      }

      const newStepper = new Stepper({
        applicationId: application._id,
        through: obj.through,
        intake: obj.intake,
        program: obj.program,
        university: obj.university,
        partnership: obj.partnership,
        steps: currentSteps,
      });

      const savedStepper = await newStepper.save();

      steppers.push(savedStepper._id);

      statuses.push(savedStepper?.steps[0]?.name);

      intakes.push(obj?.intake);

      assignees.push(new ObjectId(assignee));

      if (assignee) {
        const newWork = new Work({
          applicationId: application._id,
          stepperId: savedStepper._id,
          studentId: application.studentId,
          assignee: new ObjectId(assignee),
          stepNumber: 1,
          stepStatus: "pending",
        });

        console.log("newWork", newWork);

        await newWork.save();
      }
    }

    await Application.findByIdAndUpdate(application._id, {
      $set: {
        steppers: steppers,
        statuses: statuses,
        intakes: intakes,
        assignees: assignees,
      },
    });

    res.status(200).json({ msg: "New Application Created" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Something went wrong" });
  }
};

//Get All Applications;
applicationCtrl.GetAllApplications = async (req, res) => {
  // filters
  const country = req.query.country;
  const intake = req.query.intake;
  const startDateQuery = req.query.start_date;
  const endDateQuery = req.query.end_date;

  let status;
  if (req.query.status) {
    status = decodeURIComponent(req.query.status);
  }

  //search query;
  const searchQuery = req.query.search;

  // Paginators
  const page = req.query.page;
  const entries = req.query.entries;

  let filters = {};
  let searchFilter = {};

  if (searchQuery) {
    searchFilter = {
      $or: [
        {
          _id: ObjectId.isValid(searchQuery)
            ? new ObjectId(searchQuery)
            : searchQuery,
        },
        { "studentDetails.name": { $regex: new RegExp(searchQuery, "i") } },
        { intakes: { $elemMatch: { $regex: new RegExp(searchQuery, "i") } } },
        { country: { $regex: new RegExp(searchQuery, "i") } },
      ],
    };
  }

  if (country) {
    filters.country = { $regex: new RegExp(country, "i") };
  }

  if (status) {
    filters.statuses = status;
  }

  if (intake) {
    filters.intakes = intake;
  }

  if (startDateQuery && endDateQuery) {
    const startDate = new Date(`${startDateQuery}T00:00:00.000+05:30`);
    const endDate = new Date(`${endDateQuery}T00:00:00.000+05:30`);
    filters.createdAt = { $gte: startDate, $lte: endDate };
  }

  // console.log(filters);

  try {
    const allApplications = await Application.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      {
        $unwind: "$studentDetails",
      },
      {
        $lookup: {
          from: "employees",
          localField: "assignees",
          foreignField: "_id",
          as: "assigneeDetails",
        },
      },
      {
        $unwind: {
          path: "$assigneeDetails",
          preserveNullAndEmptyArrays: true, // Includes documents with no assignee
        },
      },
      {
        $match: {
          ...filters,
          ...searchFilter,
        },
      },
      {
        $group: {
          _id: "$_id",
          studentId: { $first: "$studentId" },
          country: { $first: "$country" },
          intakes: { $first: "$intakes" },
          creator: { $first: "$creator" },
          steppers: { $first: "$steppers" },
          documents: { $first: "$documents" },
          statuses: { $first: "$statuses" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          assignees: { $first: "$assignees" },
          phase: { $first: "$phase" },
          studentName: { $first: "$studentDetails.name" },
          assigneeNames: { $push: "$assigneeDetails.name" },
          assigneePhones: { $push: "$assigneeDetails.phone" },
        },
      },
      {
        $project: {
          _id: 1,
          studentId: 1,
          country: 1,
          intakes: 1,
          creator: 1,
          steppers: 1,
          documents: 1,
          statuses: 1,
          createdAt: 1,
          updatedAt: 1,
          assignees: 1,
          studentName: 1,
          assigneeNames: 1,
          assigneePhones: 1,
          phase: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    // console.log("all-applications", allApplications);

    let result = allApplications;

    if (page) {
      if (entries) {
        result = result.slice((page - 1) * entries, page * entries);
      } else {
        result = result.slice((page - 1) * 10, page * 10);
      }
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
};

//Get an Application;

applicationCtrl.GetApplication = async (req, res) => {
  const applicationId = req.params.id;

  if (!(typeof applicationId === "string" || ObjectId.isValid(applicationId))) {
    return res.status(400).json({ msg: "Invalid Id format" });
  }

  try {
    const result = await Application.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(applicationId),
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "assignees",
          foreignField: "_id",
          as: "assignee",
        },
      },
      {
        $lookup: {
          from: "steppers",
          localField: "_id",
          foreignField: "applicationId",
          as: "steppers",
        },
      },
      {
        $unwind: "$student",
      },
      {
        $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          studentId: 1,
          country: 1,
          intakes: 1,
          creator: 1,
          statuses: 1,
          assignees: 1,
          documents: 1,
          createdAt: 1,
          updatedAt: 1,
          studentName: "$student.name",
          assignee: "$assignee.name",
          steppers: 1,
          phase: 1,
        },
      },
    ]);

    if (!result.length)
      return res.status(404).json({ msg: "Application doesn't exist" });

    res.status(200).json(result[0]);
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
};

// Update Application;
applicationCtrl.UpdateApplication = async (req, res) => {
  const { applicationId, ...updates } = req.body;
  console.log(req.body);

  if (!(typeof applicationId === "string" || ObjectId.isValid(applicationId))) {
    return res.status(400).json({ msg: "Invalid Id format" });
  }

  try {
    const application = await Application.findById(applicationId);
    console.log(application);
    if (!application)
      return res.status(404).json({ msg: "Application not found" });

    if (application.phase === "completed")
      return res.status(404).json({ msg: "Application Completed" });

    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { $set: { ...updates, updatedAt: Date.now() } },
      { new: true }
    );

    console.log(updatedApplication);

    res.status(200).json({ msg: "Application Updated" });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
};

//Delete Application;
applicationCtrl.DeleteApplication = async (req, res) => {
  const applicationId = req.params.id;

  if (!(typeof applicationId === "string" || ObjectId.isValid(applicationId))) {
    return res.status(400).json({ msg: "Invalid Id format" });
  }

  try {
    const application = await Application.findById(applicationId);
    if (!application)
      return res.status(404).json({ msg: "Application doesn't exist" });

    // const assigneesArray = application?.assignees;

    await Application.findByIdAndDelete(applicationId)
      .then(async () => {
        await Stepper.deleteMany({ applicationId: application._id });

        // Remove related  works
        await Work.deleteMany({ applicationId: application._id });
      })
      .catch((error) => {
        console.log(error);
      });

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
};

applicationCtrl.CheckDocName = async (req, res, next) => {
  const applicationId = req.params.id;

  try {
    const application = await Application.findById(applicationId);
    if (!application)
      return res.status(400).json({ msg: "Application not found" });

    if (application.phase === "completed" || application.phase === "cancelled")
      return res.status(404).json({ msg: "Inactive Application" });

    // const docName = req.query.name;
    const docName = req.params.name;
    console.log("docName", docName);

    const docNameRegex = new RegExp(docName, "i");

    const exists = await Application.findOne({
      _id: applicationId,
      documents: { $elemMatch: { name: docNameRegex } },
    });
    console.log("exists", exists);

    if (exists) {
      console.log("Document already exists");
      return res.status(400).json({ msg: "The Document already exists" });
    } else {
      next();
    }
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
};

// Upload files to AWS S3 Bucket 2nd part => Update doc with uploaded urls;

applicationCtrl.UploadDoc = async (req, res) => {
  const applicationId = req.params.id;

  console.log("*applicationId*", applicationId);
  if (!applicationId)
    return res.status(500).json({ msg: "Invalid applicationId" });

  if (!req.file) return res.status(400).json({ msg: "File not present" });

  const docName = req.params.name;
  console.log("docName", docName);
  const docNameRegex = new RegExp(docName, "i");

  try {
    const exists = await Application.findOne({
      _id: applicationId,
      documents: { $elemMatch: { name: docNameRegex } },
    });

    if (exists) {
      console.log("Document already exists");
      return res.status(400).json({ msg: "The Document already exists" });
    }

    const newDocument = {
      name: docName,
      key: req.file.key,
      location: req.file.location,
    };

    await Application.findByIdAndUpdate(applicationId, {
      $push: { documents: newDocument },
    });

    res.status(200).json({ msg: "Documents uploaded successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Documents upload  failed" });
  }
};

applicationCtrl.GetDocument = async (req, res) => {
  const applicationId = req.params.id;

  console.log("*applicationId*", applicationId);
  if (!applicationId)
    return res.status(500).json({ msg: "Invalid applicationId" });

  console.log("req.body", req.body);
  console.log("req.file", req.file);

  // const {docName} = req.body;
  const docName = req.params.name;
  console.log("docName", docName);
  const docNameRegex = new RegExp(docName, "i");

  try {
    const exists = await Application.findOne({
      _id: applicationId,
      documents: { $elemMatch: { name: docNameRegex } },
    });
    if (!exists)
      return res.status(404).json({ msg: "Document doesn't exists" });

    const document = exists.documents.find((doc) => {
      return docNameRegex.test(doc.name);
    });

    console.log(document);

    if (!document) return res.status(404).json({ msg: "document not found" });

    const ObjectKey = document.key;
    console.log(ObjectKey);
    if (!ObjectKey) return res.status(404).json({ msg: "The Key not found" });

    const params = {
      Bucket,
      Key: ObjectKey,
    };

    const getObjectCommand = new GetObjectCommand(params);

    const data = await s3Client.send(getObjectCommand);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${document.name}`
    );

    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', 'attachment; filename=your-pdf-name.pdf');

    data.Body.pipe(res);

    // res.status(200).send(fileData)
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Something went wrong" });
  }
};

applicationCtrl.DeleteDocument = async (req, res) => {
  const applicationId = req.params.id;

  console.log("*applicationId*", applicationId);
  if (!applicationId)
    return res.status(500).json({ msg: "Invalid applicationId" });

  console.log("req.body", req.body);
  console.log("req.file", req.file);

  // const {docName} = req.body;
  const docName = req.params.name;
  console.log("docName", docName);
  const docNameRegex = new RegExp(docName, "i");

  try {
    const exists = await Application.findOne({
      _id: applicationId,
      documents: { $elemMatch: { name: docNameRegex } },
    });
    if (!exists)
      return res.status(404).json({ msg: "Document doesn't exists" });

    const document = exists.documents.find((doc) => {
      return docNameRegex.test(doc.name);
    });

    console.log(document);

    if (!document) return res.status(404).json({ msg: "document not found" });

    const ObjectKey = document.key;
    console.log(ObjectKey);

    const params = {
      Bucket,
      Key: ObjectKey,
    };

    const deleteObjectCommand = new DeleteObjectCommand(params);

    const data = await s3Client.send(deleteObjectCommand);

    console.log("deleted data", data);

    const updatedAppDoc = await Application.findOneAndUpdate(
      { _id: applicationId, documents: { $elemMatch: { name: docNameRegex } } },
      { $pull: { documents: { name: docNameRegex } } },
      { new: true }
    );

    res
      .status(200)
      .json({ msg: "Document deleted Successfully", updatedAppDoc });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Something went wrong" });
  }
};

applicationCtrl.UpdateDocument = async (req, res) => {
  const applicationId = req.params.id;

  console.log("*applicationId*", applicationId);
  if (!applicationId)
    return res.status(500).json({ msg: "Invalid applicationId" });

  // console.log("req.body", req.body)
  console.log("req.file", req.file);

  if (!req.file) return res.status(400).json({ msg: "File not present" });

  // const {docName} = req.body;
  const docName = req.params.name;
  console.log("docName", docName);
  const docNameRegex = new RegExp(docName, "i");

  try {
    const exists = await Application.findOne({
      _id: applicationId,
      documents: { $elemMatch: { name: docNameRegex } },
    });
    if (!exists)
      return res.status(404).json({ msg: "Document doesn't exists" });

    const document = exists.documents.find((doc) => {
      return docNameRegex.test(doc.name);
    });

    console.log(document);

    if (!document) return res.status(404).json({ msg: "document not found" });

    const ObjectKey = document.key;
    console.log(ObjectKey);

    const params = {
      Bucket,
      Key: ObjectKey,
    };

    const deleteObjectCommand = new DeleteObjectCommand(params);

    const newDocument = {
      name: docName,
      key: req.file.key,
      location: req.file.location,
    };

    if (ObjectKey) {
      const data = await s3Client.send(deleteObjectCommand);
      console.log("deleted data", data);
    }

    await Application.findOneAndUpdate(
      { _id: applicationId, documents: { $elemMatch: { name: docNameRegex } } },
      { $pull: { documents: { name: docNameRegex } } }
    );

    const updatedAppDoc = await Application.findByIdAndUpdate(
      applicationId,
      { $push: { documents: newDocument } },
      { new: true }
    );

    res
      .status(200)
      .json({ msg: "Document Updated Successfully", updatedAppDoc });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Something went wrong" });
  }
};

applicationCtrl.PhaseChange = async (req, res) => {
  const applicationId = req.params.id;
  const phase = req.body.phase;

  try {
    const application = await Application.findById(applicationId);
    if (!application) res.status(404).json({ msg: "Application not found" });

    await Application.findByIdAndUpdate(application._id, {
      $set: { phase: phase },
    });

    res.status(200).json({ msg: "Application State changed" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Something went wrong" });
  }
};

module.exports = applicationCtrl;
