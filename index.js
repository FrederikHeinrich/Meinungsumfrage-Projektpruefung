//----------------------------------------------
const colors = require("colors");
(express = require("express")),
  (morgan = require("morgan")),
  (basicAuth = require("express-basic-auth")),
  (nodemailer = require("nodemailer")),
  (mongoose = require("mongoose")),
  (config = require("./config")),
  (app = express()),
  (emailer = nodemailer.createTransport(config.email));

//----------------------------------------------
console.clear();
console.log(
  colors.rainbow(`
    ███████ ██    ██ ██████  ██    ██ ███████ ██    ██ 
    ██      ██    ██ ██   ██ ██    ██ ██       ██  ██  
    ███████ ██    ██ ██████  ██    ██ █████     ████   
         ██ ██    ██ ██   ██  ██  ██  ██         ██    
    ███████  ██████  ██   ██   ████   ███████    ██
                                                   `)
);
//----------------------------------------------

app.use(morgan("dev"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

var Invites = require("./models/Invite");
var Surveys = require("./models/Survey");
const Survey = require("./models/Survey");

//----------------------------------------------

mongoose.connect(config.database.mongoDb, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async function () {
  console.log(
    colors.green(
      `Database connected to: ${colors.underline(config.database.mongoDb)}`
    )
  );
});

//----------------------------------------------

async function validateInvite(surveyId, inviteId) {
  console.log(colors.yellow(`Verify an invitation!`));
  //check if not valid or expired
  try {
    var invite = await Invites.findOne({
      _id: inviteId,
      surveyId: surveyId,
    }); // Get used Invite
  } catch (er) {
    console.log(colors.red(`Verification Incorrect! ${er}`));
    return { is: false, error: er, description: "Ein Fehler ist aufgetreten!" };
  }
  if (invite == null) {
    console.log(colors.red(`Verification Incorrect! Invitation not Found!`));
    return {
      is: false,
      error: "Einladung nicht gefunden",
      description: "Ein Fehler ist aufgetreten!",
    };
  }
  if (!invite.valid) {
    console.log(colors.red(`Verification Incorrect! Invitation is not valid!`));
    return {
      is: false,
      error: "Einladung wurde deaktiviert!",
      description: "Ein Fehler ist aufgetreten!",
    };
  }
  if (invite.expiryDate.getTime() < new Date().getTime()) {
    console.log(colors.red(`Verification Incorrect! Invitation has expired!`));
    return {
      is: false,
      error: "Einladung ist abgelaufen!",
      description: "Ein Fehler ist aufgetreten!",
    };
  }
  console.log(colors.green(`Verification completed!`));
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

  console.log(colors.green(`Receive a completed survey!`));

  var valid = await validateInvite(survey._id, invite._id); //Test if Invite is Valid
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
    users: { admin: config.admin.password },
    challenge: true,
  })
);

// Show Admin Startpage
admin.get("/", async function (req, res) {
  var surveys = await Surveys.find({});
  console.log(colors.green(`Render: ${"pages/admin/index"}`));
  res.render("pages/admin/index");
});

// Show Survays
admin.get("/surveys", async function (req, res) {
  var surveys = await Surveys.find({});
  console.log(colors.green(`Render: ${"pages/admin/surveys"}`));
  res.render("pages/admin/surveys", { surveys });
});

// Create Survay
admin.post("/survey/create", async function (req, res) {
  var name = req.body.name;
  var description = req.body.description;
  var survey = await Surveys.create({ name: name, description: description });
  console.log(
    colors.green(`Create a Survey:
    Name: ${survey.name}
    Description: ${survey.description}
    `)
  );
  res.redirect(`pages/admin/survey/${survey._id}`);
});

// Show Survey
admin.get("/survey/:surveyId", async function (req, res) {
  var surveyId = req.params.surveyId;
  var survey = await Surveys.findOne({ _id: surveyId });

  if (survey == null) return res.redirect("/admin/surveys");

  var invitecount = await Invites.countDocuments({ surveyId: survey._id });
  res.render("pages/admin/survey", { survey, invitecount });
});

// Show Invites
admin.get("/survey/:surveyId/invites", async function (req, res) {
  var surveyId = req.params.surveyId;
  var survey = await Surveys.findOne({ _id: surveyId });

  if (survey == null) return res.redirect("/admin/surveys");

  var invites = await Invites.find({ surveyId: survey._id });
  res.render("pages/admin/invites", { survey, invites });
});

// Manage Invites
admin.post("/survey/:surveyId/invites", async function (req, res) {
  var action = req.body.action;
  switch (action) {
    case "delete":
      await Invites.deleteOne({ _id: req.body.inviteId });
      console.log(
        colors.green(
          `Delete Invite: ${colors.underline(
            req.body.inviteId
          )} for Survey: ${colors.underline(req.params.surveyId)}`
        )
      );
      res.redirect(`/admin/survey/${req.params.surveyId}/invites`);
      break;
    case "deleteAll":
      await Invites.deleteMany({ surveyId: req.params.surveyId });
      console.log(
        colors.green(
          `Delete ${colors.bold(`all`)} Invites for Survey: ${colors.underline(
            req.params.surveyId
          )}`
        )
      );
      res.redirect(`/admin/survey/${req.params.surveyId}/invites`);
      break;
    case "invite":
      var surveyId = req.params.surveyId;
      var email = req.body.email;
      var survey = await Surveys.findOne({ _id: surveyId });
      survey.invitedEmails.push(email);
      await survey.save();
      var invite = await Invites.create({ surveyId: survey._id });
      console.log(
        colors.green(
          `Create Invite: ${colors.underline(
            invite._id
          )} for Survey: ${colors.underline(req.params.surveyId)}`
        )
      );
      // send E-mail
      let info = await emailer.sendMail({
        from: config.EMail_Sender,
        to: email,
        subject: config.EMail_Title,
        html: `<a href="${config.Web_Domain}/${invite.surveyId}/${invite._id}">Hier Klicken!</a>
        oder öffne diesen Link: ${config.Web_Domain}/${invite.surveyId}/${invite._id}`,
      });
      console.log(
        colors.green(
          `Send Invite Mail to: ${colors.underline(
            email
          )} for Survey: ${colors.underline(req.params.surveyId)}`
        )
      );
      res.redirect(`/admin/survey/${surveyId}/invites`);
      break;
  }
});

// Show Questions
admin.get("/survey/:surveyId/questions", async function (req, res) {
  var survey = await Surveys.findOne({ _id: req.params.surveyId });
  if (survey == null) return res.redirect("/admin/surveys");
  res.render("pages/admin/questions", { survey });
});

// Manage Questions
admin.post("/survey/:surveyId/questions", async function (req, res) {
  var action = req.body.action;
  switch (action) {
    // Create Question
    case "create":
      var surveyId = req.params.surveyId;
      var fieldText = req.body.text;
      var survey = await Surveys.findOne({ _id: surveyId });
      survey.fields.push({ text: fieldText });
      await survey.save();
      res.redirect(`/admin/survey/${surveyId}/questions`);
      break;
  }
});

admin.get("/survey/:surveyId/question/:questionId", async function (req, res) {
  var surveyId = req.params.surveyId;
  var questionId = req.params.questionId;
  var survey = await Surveys.findOne({ _id: surveyId });

  if (survey == null) return res.redirect("/admin/surveys");

  var questions = survey.fields;
  var targetquestion;
  questions.forEach((question) => {
    if (question._id.toString() == questionId.toString()) {
      targetquestion = question;
    }
  });

  if (targetquestion == null)
    return res.redirect(`/admin/survey/${survey._id}/questions`);
  return res.render("pages/admin/question", {
    question: targetquestion,
    survey,
  });
});

admin.post("/survey/:surveyId/question/:questionId", async function (req, res) {
  var action = req.body.action;
  switch (action) {
    // Delete Question
    case "delete":
      var questionId = req.params.questionId;
      var surveyId = req.params.surveyId;
      var survey = await Surveys.findOne({ _id: surveyId });
      var fields = survey.fields;
      var i = 0;
      fields.forEach((field) => {
        if (field._id == questionId) {
          fields.splice(i, 1);
        } else {
          i++;
        }
      });
      await survey.save();
      res.redirect(`/admin/survey/${req.params.surveyId}/questions`);
      break;
    case "save":
      var questionId = req.params.questionId;
      var surveyId = req.params.surveyId;
      var survey = await Surveys.findOne({ _id: surveyId });
      var fields = survey.fields;
      fields.forEach((field) => {
        if (field._id == questionId) {
          field.text = req.body.text;
          field.orderId = req.body.orderId;
        }
      });
      await survey.save();
      res.redirect(`/admin/survey/${req.params.surveyId}/questions`);
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

app.listen(config.web.port, async function () {
  console.log(
    colors.green(
      `Server is listenning to port: ${colors.underline(config.web.port)}`
    )
  );
});
