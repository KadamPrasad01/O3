const http = require("http");

const fileId = "b6b90f5d-6f53-4ab4-a897-d6b311398e7e";
console.log(`Sending DELETE request to http://localhost:3000/files/${fileId} ...`);

const req = http.request({
  hostname: "localhost",
  port: 3000,
  path: `/files/${fileId}`,
  method: "DELETE"
}, (res) => {
  let data = "";
  console.log(`STATUS: ${res.statusCode}`);
  
  res.on("data", (chunk) => {
    data += chunk;
  });
  
  res.on("end", () => {
    console.log("BODY:", data);
    process.exit(0);
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

req.end();
