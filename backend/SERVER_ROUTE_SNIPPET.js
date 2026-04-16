
// I backend/src/app.js eller backend/src/server.js, lägg till:

const preferencesRoute = require("./routes/preferences");
const scheduleGenerateRoute = require("./routes/generate");

app.use("/api/preferences", preferencesRoute);
app.use("/api/schedule", scheduleGenerateRoute);

// Om du redan har express.json():
// app.use(express.json());
