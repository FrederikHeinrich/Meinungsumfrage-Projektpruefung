require("dotenv").config();

module.exports = {
  EMailHost: process.env.EMAILHOST,
  EMailPort: process.env.EMAILPORT,
  EMailSecure: process.env.EMAILSECURE,
  EMailUser: process.env.EMAILUSER,
  EMailPass: process.env.EMAILPASS,
};
