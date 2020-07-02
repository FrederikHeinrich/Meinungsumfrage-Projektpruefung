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

async function validateInvite(surveyId, inviteId, error, description) {
  //check if not valid or expired
  try {
    var invite = await Invites.findOne({
      _id: inviteId,
      surveyId: surveyId,
    }); // Get used Invite
  } catch (er) {
    return { is: false, error: er, description: "Ein Fehler ist aufgetreten!" };
  }
  if (invite == null)
    return {
      is: false,
      error: "Einladung nicht gefunden",
      description: "Ein Fehler ist aufgetreten!",
    };
  if (!invite.valid)
    return {
      is: false,
      error: "Einladung wurde deaktiviert!",
      description: "Ein Fehler ist aufgetreten!",
    };
  if (invite.expiryDate.getTime() < new Date().getTime())
    return {
      is: false,
      error: "Einladung ist abgelaufen!",
      description: "Ein Fehler ist aufgetreten!",
    };

  return { is: true };
}

//----------------------------------------------
//User Router
app.get("/", async function (req, res) {
  res.render("pages/index");
});

// Manage User Answers
app.post("/", async function (req, res) {
  var survey = await Surveys.findOne({ _id: req.body.surveyId }); // Get filled Survay
  var invite = await Invites.findOne({ _id: req.body.inviteId }); // Get used Invite

  var valid = await validateInvite(surveyId, inviteId); //Test if Invite is Valid
  if (!valid.is) {
    res.render("pages/error", {
      error: valid.error,
      description: valid.description,
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

// Create Admin Router
var admin = express.Router();

// Setup Password Promt for the Admin area
admin.use(
  basicAuth({
    users: { admin: config.Admin_Password },
    challenge: true,
  })
);

// Show Admin Startpage
admin.get("/", async function (req, res) {
  var surveys = await Surveys.find({});
  res.render("pages/admin/surveys", { surveys });
});

// Show Survays
admin.get("/surveys", async function (req, res) {
  var surveys = await Surveys.find({});
  res.render("pages/admin/surveys", { surveys });
});

// Create Survay
admin.post("/survey/create", async function (req, res) {
  var name = req.body.name;
  var description = req.body.description;
  var survey = await Surveys.create({ name: name, description: description });
  res.redirect(survey._id);
});

// Show Survey
admin.get("/survey/:surveyId", async function (req, res) {
  var surveyId = req.params.surveyId;
  var survey = await Surveys.findOne({ _id: surveyId });
  var invitecount = await Invites.find({ surveyId: survey._id }).count();
  res.render("pages/admin/survey", { survey, invitecount });
});

// Show Invites
admin.get("/survey/:surveyId/invites", async function (req, res) {
  var surveyId = req.params.surveyId;
  var survey = await Surveys.findOne({ _id: surveyId });
  var invites = await Invites.find({ surveyId: survey._id });
  res.render("pages/admin/invites", { survey, invites });
});

// Manage Invites
admin.post("/survey/:surveyId/invites", async function (req, res) {
  var action = req.body.action;
  switch (action) {
    case "delete":
      await Invites.deleteOne({ _id: req.body.inviteId });
      res.redirect(`/admin/survey/${req.params.surveyId}/invites`);
      break;
    case "deleteAll":
      await Invites.deleteMany({ surveyId: req.params.surveyId });
      res.redirect(`/admin/survey/${req.params.surveyId}/invites`);
      break;
  }
});

// Show Questions
admin.get("/survey/:surveyId/questions", async function (req, res) {
  var survey = await Surveys.findOne({ _id: req.params.surveyId });
  res.render("pages/admin/questions", { survey });
});

// Manage Questions
admin.post("/survey/:surveyId/questions", async function (req, res) {
  var action = req.body.action;
  switch (action) {
    // Delete Question
    case "delete":
      var questionId = req.body.questionId;
      res.redirect(`/admin/survey/${req.params.surveyId}/questions`);
      break;
    // Create Question
    case "create":
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

  var valid = await validateInvite(surveyId, inviteId);
  if (!valid.is) {
    res.render("pages/error", {
      error: valid.error,
      description: valid.description,
    });
  } else {
    var survey = await Surveys.findOne({
      _id: surveyId,
    });
    var invite = await Invites.findOne({
      surveyId: surveyId,
      _id: req.params.inviteId,
    });
    res.render("pages/survey", { invite, survey });
  }
});

app.listen(config.Web_Port, async function () {
  console.log("Server ist Online!");
});
