require("dotenv").config();
const supabase = require("../src/lib/supabase");

async function runTest() {
  console.log("Checking Supabase connection and listing buckets...");
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error("Supabase Storage Connection Error:", error);
    return;
  }
  
  console.log("Connection successful! Found buckets:");
  console.log(JSON.stringify(data, null, 2));

  const targetBucket = data.find(b => b.name === "o3-files");
  if (!targetBucket) {
    console.warn("WARNING: The bucket 'o3-files' was not found! Please create it in your Supabase Dashboard.");
  } else {
    console.log("Success: 'o3-files' bucket exists.");
  }
}

runTest();
