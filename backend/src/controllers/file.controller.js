const fs = require("fs")
const path = require("path")
const { v4: uuid4 } = require("uuid")
const prisma = require("../lib/prisma")
const supabase = require("../lib/supabase")

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
        const extension = path.extname(req.file.originalname)
        const storedName = `${fileId}${extension}`
        const userId = req.user.id;

        // 1. Upload file buffer to Supabase Storage Bucket
        const { data, error } = await supabase.storage
            .from("o3-files")
            .upload(`${userId}/${storedName}`, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            })
        if (error) throw error

        // 2. Retrieve public URL
        const { data: urlData } = supabase.storage
            .from("o3-files")
            .getPublicUrl(`${userId}/${storedName}`)
        const fileUrl = urlData.publicUrl

        // 3. Save metadata to Prisma database inside transaction
        const savedFile = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated; SET LOCAL app.current_user_id = '${userId}';`);
            return await tx.file.create({
                data: {
                    id: fileId,
                    originalName: req.file.originalname,
                    storedName: storedName,
                    url: fileUrl,
                    userId: userId
                }
            });
        });

        res.status(201).json({
            message: "File uploaded to Supabase successfully",
            file: savedFile
        })
    } catch (error) {
        console.error("Upload error:", error)
        res.status(500).json({ error: "Failed to upload file to storage" })
    }
}
const downloadFiles = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.id;

        // 1. Find record using Prisma RLS transaction
        const fileRecord = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated; SET LOCAL app.current_user_id = '${userId}';`);
            return await tx.file.findUnique({
                where: { id }
            });
        });

        if (!fileRecord) {
            return res.status(404).json({ error: "File record not found or access denied" })
        }

        // 2. Generate a signed temporary download URL from Supabase
        const { data, error } = await supabase.storage
            .from("o3-files")
            .createSignedUrl(`${userId}/${fileRecord.storedName}`, 60) // valid for 60 seconds
        if (error || !data) throw error

        // Redirect the user to download the file directly from Supabase Cloud
        res.redirect(data.signedUrl)
    } catch (error) {
        console.error("Download error:", error)
        res.status(500).json({ error: "Failed to download file" })
    }
}
const deleteFiles = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.id;

        // 1. Delete database record under RLS transaction
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

        if (!fileRecord) {
            return res.status(404).json({ error: "File record not found or access denied" })
        }

        // 2. Delete the file from Supabase Storage
        const { error } = await supabase.storage
            .from("o3-files")
            .remove([`${userId}/${fileRecord.storedName}`])
        if (error) console.error("Could not delete from cloud storage:", error)

        res.json({
            message: "File deleted successfully"
        })
    } catch (error) {
        console.error("Delete error:", error)
        res.status(500).json({ error: "Failed to delete file" })
    }
}

module.exports = {
    getFiles, uploadFiles , downloadFiles , deleteFiles
}