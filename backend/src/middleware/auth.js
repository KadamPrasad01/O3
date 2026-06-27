const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ error: "Access Denied: No Token Provided" });
    }
    
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_key");
        req.user = verified; // Contains { id: "...", email: "..." }
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or Expired Token" });
    }
};

module.exports = authenticate;
