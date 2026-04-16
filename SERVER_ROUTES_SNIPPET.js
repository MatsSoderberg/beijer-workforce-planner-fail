const wizardStateRoute = require("./routes/wizardState");
const scheduleVersionsRoute = require("./routes/scheduleVersions");

app.use("/api/wizard-state", wizardStateRoute);
app.use("/api/schedule-versions", scheduleVersionsRoute);

// Om du inte redan har dem:
const preferencesRoute = require("./routes/preferences");
const scheduleGenerateRoute = require("./routes/generate");
app.use("/api/preferences", preferencesRoute);
app.use("/api/schedule", scheduleGenerateRoute);
