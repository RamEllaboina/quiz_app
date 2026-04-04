const fs = require("fs");
const { JSDOM } = require("jsdom");

try {
    const html = fs.readFileSync("c:/full stack/quiz_app/frontend/index.html", "utf-8");
    const dom = new JSDOM(html, {
        runScripts: "dangerously",
        resources: "usable"
    });
    
    dom.window.document.addEventListener("DOMContentLoaded", () => {
        console.log("DOM Loaded.");
        console.log("typeof window.userLogout:", typeof dom.window.userLogout);
    });

    dom.window.addEventListener("error", (event) => {
        console.error("JSDOM Error:", event.error);
    });

    setTimeout(() => {
        console.log("End of check. typeof window.userLogout:", typeof dom.window.userLogout);
        process.exit();
    }, 2000);
} catch (e) {
    console.error("Setup error:", e);
}
