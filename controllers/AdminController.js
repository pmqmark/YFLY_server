const bcrypt = require("bcrypt");
const Admin = require("../models/AdminModel");
const mongoose = require("mongoose");
const Application = require("../models/ApplicationModel");
const Employee = require("../models/EmployeeModel");
const Work = require("../models/WorkModel");
const Stepper = require("../models/StepperModel");
const ObjectId = mongoose.Types.ObjectId;
const adminCtrl = {};

// Get Details;
adminCtrl.GetAdmin = async (req, res) => {
    const adminId = req.params.id;

    if (!(typeof adminId === 'string' || ObjectId.isValid(adminId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const admin = await Admin.findById(adminId, { password: 0 });
        console.log(admin);

        if (!admin) return res.status(404).json({ msg: "Admin Not found" });

        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}

// Update Admin;
adminCtrl.UpdateAdmin = async (req, res) => {
    console.log(req.body);
    const adminId = req.body.adminId;

    if (!(typeof adminId === 'string' || ObjectId.isValid(adminId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {


        const admin = await Admin.findById(adminId);
        if (!admin) return res.status(404).json({ msg: "Admin not found" });

        if (req.body.name) {
            {
                const nameRegex = /^[A-Za-z ]{3,}$/;
                if (!nameRegex.test(req.body.name)) return res.status(400).json({ msg: "Invalid Name format" });
            }
        }

        if (req.body.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(req.body.email)) return res.status(400).json({ msg: "Invalid Email format" });
        }

        if (req.body.password) {

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);

            req.body.password = hashedPassword;
        }

        console.log("req.body", req.body);

        const updatedDocument = await Admin.findByIdAndUpdate(adminId, {
            $set: req.body
        }, { new: true });

        console.log("updatedDoc", updatedDocument)

        res.status(200).json({ msg: "Admin Updated" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Something went wrong" });
    }
}

// Change password;
adminCtrl.ChangePassword = async (req, res) => {
    const adminId = req.body.adminId;
    const password = req.body.password;

    if (!(typeof adminId === 'string' || ObjectId.isValid(adminId))) {
        return res.status(400).json({ msg: "Invalid Id format" });
    }

    try {
        const admin = await Admin.findById(adminId);
        if (!admin) return res.status(404).json({ msg: "Admin not found" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Admin.findByIdAndUpdate(adminId, {
            $set: { password: hashedPassword }
        })

        res.status(200).json({ msg: "Password changed" });
    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}

// Get Application Metrics ==>Count of Application (All, Current, Completed, Cancelled), Non-enrollments, Deferrals;
// Filters ==> Country, Intake, Date , Year.

adminCtrl.GetApplicationMetrics = async (req, res) => {
    const country = req.query.country;
    const intake = req.query.intake;
    const startDateQuery = req.query.start_date;
    const endDateQuery = req.query.end_date;
    const year = req.query.year;

    let filters = {};

    if (country) { filters.country = { $regex: new RegExp(country, 'i') } };

    if (intake) { filters.intakes = intake};

    if (startDateQuery && endDateQuery) {
        const startDate = new Date(`${startDateQuery}T00:00:00.000+05:30`);
        const endDate = new Date(`${endDateQuery}T00:00:00.000+05:30`);
        filters.createdAt = { $gte: startDate, $lte: endDate }
    };

    if (year) {
        const yearStart = new Date(`${year}-01-01T00:00:00.000+05:30`);
        const yearEnd = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000+05:30`);

        filters.createdAt = { $gte: yearStart, $lt: yearEnd };
    };

    console.log(filters);

    try {
        const allApplications = await Application.find(filters).countDocuments();
        console.log("all", allApplications);

        const pendingApplications = await Application.find({ ...filters, phase: "pending" }).countDocuments();
        console.log("processing", pendingApplications);

        const ongoingApplications = await Application.find({ ...filters, phase: "ongoing" }).countDocuments();
        console.log("processing", ongoingApplications);

        const completedApplications = await Application.find({ ...filters, phase: "completed" }).countDocuments();
        console.log("completed", completedApplications);

        const defferredApplications = await Application.find({ ...filters, phase: "deffered" }).countDocuments();
        console.log("deffered", defferredApplications);

        const cancelledApplications = await Application.find({ ...filters, phase: "cancelled" }).countDocuments();
        console.log("cancelled", cancelledApplications);

        const notEnrolledApplications = await Application.find({ ...filters, phase: "not-enrolled" }).countDocuments();
        console.log("not-enrolled", notEnrolledApplications);


        res.status(200).json([
            { name: "All", value: allApplications },
            { name: "Pending", value: pendingApplications },
            { name: "On-going", value: ongoingApplications },
            { name: "Completed", value: completedApplications },
            { name: "Deffered", value: defferredApplications },
            { name: "Cancelled", value: cancelledApplications },
            { name: "Non-enrolled", value: notEnrolledApplications },
        ])

    } catch (error) {
        res.status(500).json({ msg: "Something went wrong" })
    }
}




module.exports = adminCtrl;
