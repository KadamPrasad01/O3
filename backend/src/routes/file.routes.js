const express = require("express")
const multer = require("multer")
const path = require("path")
const {v4 : uuid4} = require("uuid") 
const {PrismaClient} = require("@prisma/client")
const router = express.Router()

//cb - callback function 
const storage = multer.diskStorage({
    destination : (req,file,cb) =>{
        cb(null, "uploads/")
    },

    // extname - extension name
    filename : (req , file , cb) =>{
        const extension = path.extname(file.originalname)
        cb(null , uuid4() + extension)
    }
})
const upload = multer({
    storage
})

const authenticate = require("../middleware/auth")
const {getFiles,uploadFiles , downloadFiles , deleteFiles} = require("../controllers/file.controller")
router.get("/files", authenticate, getFiles)
router.post("/upload",
    authenticate,
    upload.single("file"),
    uploadFiles)
router.get("/files/:id", authenticate, downloadFiles)
router.delete("/files/:id", authenticate, deleteFiles)


module.exports = router