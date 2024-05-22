const nodemailer = require("nodemailer");
// const fs = require('fs');

module.exports = {
  sendMail: async function (mailOptions) {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: 'noreply.grovix@gmail.com',
        pass: process.env.MAIL_PASS 
      }
    });

    return await transporter.sendMail(mailOptions);
  }
}; 