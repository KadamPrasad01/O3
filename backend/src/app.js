const express = require("express")
const cors = require("cors")
const app = express()
const healthRoutes = require("./routes/health.routes")
const fileRoutes = require("./routes/file.routes")
const authRoutes = require("./routes/auth.routes")

app.use(cors())
app.use(express.json())
app.use("/",healthRoutes)
app.use("/auth",authRoutes)
app.use("/",fileRoutes)

module.exports = app