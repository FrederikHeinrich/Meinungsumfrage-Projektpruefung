
const nodemailer = require("nodemailer");
//----------------------------------------------
var emailer = nodemailer.createTransport({
    host: "smtp.eu.mailgun.org",
    port: 465,
    secure: true,
    auth: {
        user: "tsbw@email.frederikheinrich.de",
        pass: "6022bbcddf76d98f14e9063976706530-913a5827-7dd59382",
    },
});

emailer.sendMail({
    from: '"asdas" <asda@frederikheinrich.de>', // sender address
    to: "mail@FrederikHeinrich.de", // list of receivers (e-mail, e-mail, e-mail)
    subject: "Surveys", // Subject line
    html: `Hey... Hello there is a survey ... Please click on the link to fill out your survey.`
});