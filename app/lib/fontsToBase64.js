// app/lib/fontsToBase64.js
const fs = require("fs");
const path = require("path");

function toBase64(filePath) {
  const file = fs.readFileSync(filePath);
  return file.toString("base64");
}

const regularPath = path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf");
const boldPath = path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf");

console.log("INTER_REGULAR_BASE64=");
console.log(toBase64(regularPath));
console.log("\n\nINTER_BOLD_BASE64=");
console.log(toBase64(boldPath));
