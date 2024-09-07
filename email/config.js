const nodemailer = require("nodemailer");
// const fs = require('fs');

module.exports = {
  sendMail: async (mailOptions) => {
    let transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      secure: true,
      port: 465,
      auth: {
        user: "noreply@grovixlab.com",
        pass: process.env.APP_PASS
      },
    });


    return await transporter.sendMail(mailOptions);
  }
}; 