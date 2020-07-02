//----------------------------------------------
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var morgan = require("morgan");
var basicAuth = require("express-basic-auth");

const nodemailer = require("nodemailer");

var mongoose = require("mongoose");

var config = require("./config");
//----------------------------------------------

var app = express();
app.use(morgan("dev"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

var Invites = require("./models/Invite");
var Surveys = require("./models/Survey");

//----------------------------------------------

mongoose.connect("mongodb://localhost/Surveys", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async function () {
  console.log("Database Connected!");
});

//----------------------------------------------

var emailer = nodemailer.createTransport({
  host: config.EMail_Host,
  port: config.EMail_Port,
  secure: config.EMail_Secure,
  auth: {
    user: config.EMail_User,
    pass: config.EMail_Password,
  },
});

//----------------------------------------------

//----------------------------------------------

app
  .route("/")
  .get(async function (req, res) {
    res.render("pages/index");
  })
  .post(async function (req, res) {
    var survey = await Surveys.findOne({ _id: req.body.surveyId });
    var invite = await Invites.findOne({ _id: req.body.inviteId });
    if (invite == null) {
      res.render("pages/error", {
        error: "Diese Einladung gibt es nicht!",
        description:
          "Du hast die schon Beantwortet oder die wurde vom Admin gelöscht.",
      });
    } else {
      survey.entries++;
      survey.fields.forEach((field) => {
        var fieldValue = req.body[field._id];
        switch (fieldValue) {
          case "happy":
            field.happy++;
            break;
          case "okay":
            field.okay++;
            break;
          case "sad":
            field.sad++;
            break;
        }
      });

      if (req.body.comment != null && req.body.comment != "") {
        survey.comments.push(req.body.comment);
      }
      await invite.remove();
      await survey.save();

      res.redirect("/");
    }
  });

var admin = express.Router();

admin.use(
  basicAuth({
    users: { admin: config.Admin_Password },
    challenge: true,
  })
);

admin.get("/", async function (req, res) {
  res.render("pages/admin/index");
});

admin.post("/", async function (req, res) {
  res.send("ok");
});

admin.get("/surveys", async function (req, res) {
  var surveys = await Surveys.find({});
  res.render("pages/admin/surveys", { surveys });
});

admin.post("/survey/create", async function (req, res) {
  var name = req.body.name;
  var description = req.body.description;
  var survey = await Surveys.create({ name: name, description: description });
  res.redirect(survey._id);
});

admin.get("/survey/:surveyId", async function (req, res) {
  var surveyId = req.params.surveyId;
  var survey = await Surveys.findOne({ _id: surveyId });
  var invitecount = await Invites.find({ surveyId: survey._id }).count();
  res.render("pages/admin/survey", { survey, invitecount });
});
admin.get("/survey/:surveyId/invites", async function (req, res) {
  var surveyId = req.params.surveyId;
  var survey = await Surveys.findOne({ _id: surveyId });
  var invites = await Invites.find({ surveyId: survey._id });
  res.render("pages/admin/invites", { survey, invites });
});
admin.post("/survey/:surveyId/invites", async function (req, res) {
  var action = req.body.action;
  switch (action) {
    case "delete":
      var inviteId = req.body.inviteId;
      var invite = await Invites.findOne({ _id: inviteId });
      await invite.remove();
      res.redirect(`/admin/survey/${req.params.surveyId}/invites`);
      break;
  }
});

admin.post("/survey/:surveyId", async function (req, res) {
  var action = req.body.action;
  switch (action) {
    case "create":
      var surveyId = req.params.surveyId;
      var fieldText = req.body.text;
      var survey = await Surveys.findOne({ _id: surveyId });
      survey.fields.push({ text: fieldText });
      await survey.save();
      res.redirect(`/admin/survey/${surveyId}`);
      break;
    case "invite":
      var surveyId = req.params.surveyId;
      var email = req.body.email;
      var survey = await Surveys.findOne({ _id: surveyId });

      var invite = await Invites.create({ surveyId: survey._id, email: email });
      // send E-mail
      let info = await emailer.sendMail({
        from: config.EMail_Sender,
        to: email,
        subject: config.EMail_Title,
        html: `<a href="${config.Web_Domain}/${invite.surveyId}/${invite._id}">Hier Klicken!</a>
        oder öffne diesen Link: ${config.Web_Domain}/${invite.surveyId}/${invite._id}`,
      });
      res.redirect(`/admin/survey/${surveyId}/invites`);
      break;
  }
});

app.use("/admin", admin);

app.get("/:surveyId/:inviteId/", async function (req, res) {
  var surveyId = req.params.surveyId;
  var inviteId = req.params.inviteId;
  var survey = await Surveys.findOne({
    _id: surveyId,
  });
  var invite = await Invites.findOne({
    surveyId: surveyId,
    _id: req.params.inviteId,
  });
  if (invite == null) {
    res.render("pages/error", {
      error: "Keine Einladung gefunden!",
      description: "Die Einladung ist Abgelaufen oder Nicht mehr Gültig!",
    });
  } else {
    //check if not valid or expired
    if (!invite.valid) {
      res.render("pages/error", {
        error: "Die Einladung ist Ungültig",
        description: "Scheinbar wurde die Einladung deaktiviert/gesperrt!",
      });
    } else if (invite.expiryDate.getTime() < new Date().getTime()) {
      res.render("pages/error", {
        error: "Die Einladung ist Abgelaufen",
        description:
          "Du hattest 7 Tage zeit an der Umfrage Teilzunehmen... Leider ist es jetzt zuspät!",
      });
    } else {
      res.render("pages/survey", { invite, survey });
    }
  }
});

app.listen(80, async function () {
  console.log("Server ist Online!");
});
