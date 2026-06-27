const fs = require("fs")
const path = require("path")
const { v4: uuid4 } = require("uuid")
const prisma = require("../lib/prisma")

const getFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated; SET LOCAL app.current_user_id = '${userId}';`);
            return await tx.file.findMany({
                orderBy: {
                    createdAt: "desc"
                }
            });
        });
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
        const userId = req.user.id;

        // Save metadata to PostgreSQL using Prisma inside transaction to enforce RLS
        const savedFile = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated; SET LOCAL app.current_user_id = '${userId}';`);
            return await tx.file.create({
                data: {
                    id: fileId,
                    originalName: req.file.originalname,
                    storedName: req.file.filename,
                    url: fileUrl,
                    userId: userId
                }
            });
        });

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
        const userId = req.user.id;

        // Find file record in database inside transaction to enforce RLS
        const fileRecord = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated; SET LOCAL app.current_user_id = '${userId}';`);
            return await tx.file.findUnique({
                where: { id }
            });
        });

        // Check if database record exists
        if (!fileRecord) {
            return res.status(404).json({ error: "File record not found in database or access denied" })
        }

        // Construct absolute path to the file inside uploads folder
        const filePath = path.join(__dirname, "..", "..", "uploads", fileRecord.storedName)

        // Verify file exists on disk
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Physical file not found on disk" })
        }

        // Send download response with original name
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
        const userId = req.user.id;

        // Find and delete the database record inside an RLS-scoped transaction
        const fileRecord = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated; SET LOCAL app.current_user_id = '${userId}';`);
            
            const record = await tx.file.findUnique({
                where: { id }
            });
            if (!record) return null;

            await tx.file.delete({
                where: { id }
            });
            return record;
        });

        // Check if database record exists and was deleted
        if (!fileRecord) {
            return res.status(404).json({ error: "File record not found in database or access denied" })
        }

        // Construct absolute path to the physical file
        const filePath = path.join(__dirname, "..", "..", "uploads", fileRecord.storedName)

        // Delete the physical file from disk (if it exists)
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            } else {
                console.warn(`Physical file not found on disk at: ${filePath}, skipping physical delete.`)
            }
        } catch (fileErr) {
            console.error("Error deleting physical file from disk:", fileErr)
        }

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