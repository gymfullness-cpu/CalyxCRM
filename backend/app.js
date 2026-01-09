app.use(express.json());
app.use("/api/newsletter", require("./routes/newsletter.routes"));
