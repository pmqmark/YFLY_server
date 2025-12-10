const express = require("express");
const app = express();
require("dotenv").config();
const ConnectDB = require("./db");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const authRouter = require("./routes/AuthRoutes");
const adminRouter = require("./routes/AdminRoutes");
const employeeRouter = require("./routes/EmployeeRoutes");
const studentRouter = require("./routes/StudentRoutes");
const applicationRouter = require("./routes/ApplicationRoutes");
const commentRouter = require("./routes/CommentRoutes");
const projectRouter = require("./routes/ProjectRoutes");
const stepperRouter = require("./routes/StepperRoutes");
const dataRouter = require("./routes/DataRoutes");
const notificationRouter = require("./routes/NotificationRoutes");
const authMiddleware = require("./middlewares/authMiddleware");

const PORT = process.env.PORT || 8800;
const ClientURL = process.env.ClientURL;

ConnectDB();

app.use(cors({ origin: ClientURL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/images", express.static(path.join(__dirname, "/public/images")));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use("/api/data", dataRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/auth", authRouter);

app.use(authMiddleware);

app.use("/api/admin", adminRouter);
app.use("/api/employee", employeeRouter);
app.use("/api/student", studentRouter);
app.use("/api/application", applicationRouter);
app.use("/api/comment", commentRouter);
app.use("/api/project", projectRouter);
app.use("/api/stepper", stepperRouter);

app.use("*", (req, res) => {
  res.sendStatus(404);
});
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Export the Express app for serverless platforms (Vercel). When running
// locally with `node app.js` the server will still be started because
// `app.js` is the entry point; however Vercel imports this file and uses
// the wrapper in `api/index.js` which expects the app to be exported.
module.exports = app;

// If this file is executed directly (`node app.js`) start the server
// This keeps local development behavior intact while allowing Vercel
// to import the app without starting a listener.
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
