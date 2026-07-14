import fs from "fs";

const path = "/home/aqualand/bojleri.com/.htaccess";
const redirect = `RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\\.bojleri\\.com$ [NC]
RewriteRule ^ https://bojleri.com%{REQUEST_URI} [R=301,L]

`;

let text = fs.readFileSync(path, "utf8");
if (!text.includes("www\\.bojleri")) {
  fs.writeFileSync(path, redirect + text);
  console.log("redirect added");
} else {
  console.log("redirect exists");
}