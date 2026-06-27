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

const {getFiles,uploadFiles , downloadFiles , deleteFiles} = require("../controllers/file.controller")
router.get("/files",getFiles)
router.post("/upload",
    upload.single("file"),
    uploadFiles)
router.get("/files/:id",downloadFiles)
router.delete("/files/:id",deleteFiles)


module.exports = router