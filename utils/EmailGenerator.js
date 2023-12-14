const nodemailer = require("nodemailer");

const emailGenerator = (link, email)=> {
  console.log(link)
  console.log(email)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user:process.env.MAIL_USER,
      pass:process.env.MAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Click the link to Change Password",
    text: link
  };

  transporter.sendMail(mailOptions, (error, info)=> {
    if (error) {
      console.log(error);
      return false;
    } else {
      console.log('Email sent: ' + info.response);
      return true
    }
  });
}

module.exports = emailGenerator;