const fs = require("fs")
const path = require("path")
const { v4: uuid4 } = require("uuid")
const prisma = require("../lib/prisma")

const getFiles = async (req, res) => {
    try {
        const files = await prisma.file.findMany({
            orderBy: {
                createdAt: "desc"
            }
        })
        res.json(files)
    } catch (error) {
        console.error("Error retrieving files:", error)
        res.status(500).json({ error: "Failed to retrieve files" })
    }
}
const uploadFiles = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" })
        }

        const fileId = uuid4()
        const fileUrl = `${req.protocol}://${req.get("host")}/files/${fileId}`

        // Save metadata to PostgreSQL using Prisma
        const savedFile = await prisma.file.create({
            data: {
                id: fileId,
                originalName: req.file.originalname,
                storedName: req.file.filename,
                url: fileUrl
            }
        })

        res.status(201).json({
            message: "File uploaded and metadata saved successfully",
            file: savedFile
        })
    } catch (error) {
        console.error("Error saving file metadata:", error)
        res.status(500).json({ error: "Failed to save file metadata" })
    }
}
const downloadFiles = async (req, res) => {
    try {
        const { id } = req.params

        // 1. Find file record in database
        const fileRecord = await prisma.file.findUnique({
            where: { id }
        })

        // 2. Check if database record exists
        if (!fileRecord) {
            return res.status(404).json({ error: "File record not found in database" })
        }

        // 3. Construct absolute path to the file inside uploads folder
        const filePath = path.join(__dirname, "..", "..", "uploads", fileRecord.storedName)

        // 4. Verify file exists on disk
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Physical file not found on disk" })
        }

        // 5. Send download response with original name
        res.download(filePath, fileRecord.originalName, (err) => {
            if (err) {
                console.error("Error sending file download:", err)
                if (!res.headersSent) {
                    res.status(500).json({ error: "Failed to download file" })
                }
            }
        })
    } catch (error) {
        console.error("Error downloading file:", error)
        res.status(500).json({ error: "Server error occurred during download" })
    }
}
const deleteFiles = async (req, res) => {
    try {
        const { id } = req.params

        // 1. Find file record in database
        const fileRecord = await prisma.file.findUnique({
            where: { id }
        })

        // 2. Check if database record exists
        if (!fileRecord) {
            return res.status(404).json({ error: "File record not found in database" })
        }

        // 3. Construct absolute path to the physical file
        const filePath = path.join(__dirname, "..", "..", "uploads", fileRecord.storedName)

        // 4. Delete the physical file from disk (if it exists)
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            } else {
                console.warn(`Physical file not found on disk at: ${filePath}, skipping physical delete.`)
            }
        } catch (fileErr) {
            console.error("Error deleting physical file from disk:", fileErr)
            // Log the error but proceed with database deletion so the system can recover.
        }

        // 5. Delete database record
        await prisma.file.delete({
            where: { id }
        })

        res.json({
            message: "File and metadata deleted successfully"
        })
    } catch (error) {
        console.error("Error deleting file:", error)
        res.status(500).json({ error: "Server error occurred during deletion" })
    }
}

module.exports = {
    getFiles, uploadFiles , downloadFiles , deleteFiles
}