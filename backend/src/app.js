const express = require("express")
const cors = require("cors")
const app = express()
const healthRoutes = require("./routes/health.routes")
const fileRoutes = require("./routes/file.routes")

app.use(cors())
app.use(express.json())
app.use("/",healthRoutes)
app.use("/",fileRoutes)

module.exports = app