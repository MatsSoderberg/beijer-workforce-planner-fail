// Lägg in i din backend app/server-fil
const express = require("express");
const app = express();

app.use(express.json());

const preferencesRoute = require("./routes/preferences");
const scheduleGenerateRoute = require("./routes/generate");

// Exempel på route-registrering:
app.use("/api/preferences", preferencesRoute);
app.use("/api/schedule", scheduleGenerateRoute);

// Övriga routes...
module.exports = app;