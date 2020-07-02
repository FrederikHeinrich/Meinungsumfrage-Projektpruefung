require("dotenv").config();

module.exports = {
  EMail_Host: process.env.EMail_Host,
  EMail_Port: process.env.EMail_Port,
  EMail_Secure: process.env.EMail_Secure,
  EMail_User: process.env.EMail_User,
  EMail_Password: process.env.EMail_Password,

  EMail_Title: process.env.EMail_Title,
  EMail_Sender: process.env.EMail_Sender,

  Admin_Password: process.env.Admin_Password,

  Web_Domain: process.env.Web_Domain,
  Web_Port: process.env.Web_Port,
};
