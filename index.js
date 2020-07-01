//----------------------------------------------
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var morgan = require("morgan");
var session = require("express-session");

const nodemailer = require("nodemailer");

//----------------------------------------------
var app = express();

var config = require("./config");

//----------------------------------------------
// Database

var Einladungen = require("./models/Einladung");

// ------
var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/Meinungsumfragen", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async function () {
  console.log("mongodb Connected!");
  // Einladungen.create({ Email: "test@test.test" });
});

//----------------------------------------------
var emailer = nodemailer.createTransport({
  host: config.EMailHost,
  port: config.EMailPort,
  secure: config.EMailSecure,
  auth: {
    user: config.EMailUser,
    pass: config.EMailPass,
  },
});
//----------------------------------------------

app.use(morgan("dev"));

app.set("view engine", "ejs");

var { ESRCH } = require("constants");

app.route("/").get(async function (req, res) {
  res.render("pages/index");
});

app
  .route("/:token/:objectid")
  .get(async function (req, res) {
    var token = req.params.token;
    var objectid = req.params.objectid;
    var einladung = await Einladungen.findOne({
      Token: token,
      _id: req.params.objectid,
    });
    if (einladung == null) {
      res.render("pages/error", {
        error: "Keine Einladung gefunden!",
        description: "Die Einladung ist Abgelaufen oder Nicht mehr Gültig!",
      });
    } else {
      res.render("pages/umfrage", { token, objectid });
    }
  })
  .post(async function (req, res) {
    res.send("ok");
  });

app
  .route("/admin")
  .get(async function (req, res) {
    res.render("pages/admin");
  })
  .post(async function (req, res) {
    res.send("ok");
  });

app.get("/test", async function (req, res) {
  let info = await emailer.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: "mail@frederikheinrich.de", // list of receivers (e-mail, e-mail, e-mail)
    subject: "Umfrage", // Subject line
    text: "Hey... Deine Umfrage ist bereit!", // plain text body
    html:
      "<b>Hello world?</b><br><a href='https://google.de' target='#'>Click hier!</a>", // html body
  });
  res.send("Oki!");
});

app.listen(80, async function () {
  console.log("Server ist Online!");
});
