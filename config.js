require("dotenv").config();

module.exports = {
  email: {
    host: process.env.EMail_Host,
    port: process.env.EMail_Port,
    secure: process.env.EMail_Secure,
    auth: {
      user: process.env.EMail_User,
      pass: process.env.EMail_Password,
    },
  },
  web: {
    port: process.env.Web_Port,
    domain: process.env.Web_Domain,
  },
  admin: {
    password: process.env.Admin_Password,
  },
  database: {
    mongoDb: process.env.MongoDBString,
  },

  EMail_Title: process.env.EMail_Title,
  EMail_Sender: process.env.EMail_Sender,
};
