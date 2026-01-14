const { sendNotification } = require("../middlewares/firebaseAdmin");
const Employee = require("../models/EmployeeModel");
const Student = require("../models/StudentModel");
const Notification = require("../models/NotificationModel");

const employeeNotifyCtrl = {};

// Helper: remove metadata.date and metadata.time from body for test-exam notifications
const sanitizeBodyForTestExam = (origBody, metadata) => {
  if (!origBody || typeof origBody !== "string") return origBody;
  if (!metadata) return origBody;
  let sanitized = origBody;

  if (metadata.date) {
    const escapedDate = metadata.date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    sanitized = sanitized.replace(new RegExp(escapedDate, "g"), "");
  }
  if (metadata.time) {
    const escapedTime = metadata.time.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    sanitized = sanitized.replace(new RegExp(escapedTime, "g"), "");
  }

  sanitized = sanitized.replace(/[\-–—|:,]+/g, " ");
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  if (!sanitized.length) return "";
  return sanitized;
};

/**
 * Create a test-exam notification initiated by an employee.
 * - Creates a notification document for the employee (self) with metadata.relatedStudents included
 * - Creates separate notification documents for each student in `studentIdList`
 * - Attempts to send push notifications to available FCM tokens
 */
employeeNotifyCtrl.createExamNotification = async (req, res) => {
  try {
    const employeeId =
      req.user && (req.user._id || req.user.userId || req.user.id);
    if (!employeeId) return res.status(401).json({ msg: "Unauthorized" });

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ msg: "Employee not found" });

    const { title, body, route, metadata, studentIdList } = req.body;

    if (!title || typeof title !== "string")
      return res.status(400).json({ msg: "Title is required" });

    if (!Array.isArray(studentIdList) || !studentIdList.length) {
      return res.status(400).json({
        msg: "studentIdList is required and should be a non-empty array",
      });
    }

    // metadata validation for test-exam
    if (!metadata || !metadata.date || !metadata.duration) {
      return res.status(400).json({
        msg: "metadata with date and duration is required for test-exam notifications",
      });
    }
    const parsedDate = new Date(metadata.date);
    if (isNaN(parsedDate.valueOf())) {
      return res.status(400).json({ msg: "Invalid metadata.date format" });
    }
    const durationNum = Number(metadata.duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return res.status(400).json({ msg: "Invalid metadata.duration" });
    }

    // fetch students
    const students = await Student.find({ _id: { $in: studentIdList } });

    const foundStudentIds = students.map((s) => String(s._id));
    const missingStudentIds = studentIdList.filter(
      (id) => !foundStudentIds.includes(id)
    );

    // prepare relatedStudents array to attach to employee metadata
    const relatedStudents = students.map((s) => ({
      id: String(s._id),
      name: s.name,
      image: s.image,
    }));

    // sanitize body for test-exam
    const sanitizedBody = sanitizeBodyForTestExam(body, metadata);

    // create notification for the employee (self), attach relatedStudents
    const employeeMetadata = { ...(metadata || {}), relatedStudents };

    const employeeNotification = await Notification.create({
      userId: employeeId,
      notificationType: "test-exam",
      title,
      body: sanitizedBody,
      route,
      metadata: employeeMetadata,
    });

    // attempt to send to employee tokens
    const employeeTokens = Array.isArray(employee.fcmTokens)
      ? employee.fcmTokens
      : [];
    if (employeeTokens.length) {
      const payload = {
        notification: { title, body: sanitizedBody },
        data: {
          docId: String(employeeNotification._id),
          userId: String(employeeId),
          notificationType: "test-exam",
          route,
          metadata: employeeMetadata,
        },
      };

      const sendPromises = employeeTokens.map((token) =>
        sendNotification(token, { ...payload, token })
      );
      await Promise.all(sendPromises);
    }

    // create notifications for each found student
    const createdStudentNotifications = [];
    for (const student of students) {
      const sNotif = await Notification.create({
        userId: student._id,
        notificationType: "test-exam",
        title,
        body: sanitizedBody,
        route,
        metadata,
      });
      createdStudentNotifications.push(sNotif);

      // send to student tokens if present
      const studentTokens = Array.isArray(student.fcmTokens)
        ? student.fcmTokens
        : [];
      if (studentTokens.length) {
        const payload = {
          notification: { title, body: sanitizedBody },
          data: {
            docId: String(sNotif._id),
            userId: String(student._id),
            notificationType: "test-exam",
            route,
            metadata,
          },
        };
        const sendPromises = studentTokens.map((token) =>
          sendNotification(token, { ...payload, token })
        );
        await Promise.all(sendPromises);
      }
    }

    const result = {
      employeeNotification,
      studentNotifications: createdStudentNotifications,
      missingStudentIds,
    };

    res.status(200).json({ msg: "Notifications created successfully", result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Failed to create notifications" });
  }
};

module.exports = employeeNotifyCtrl;
