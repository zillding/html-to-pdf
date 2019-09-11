const os = require("os");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const puppeteer = require("puppeteer");

const htmlFilePath = path.join(os.tmpdir(), "tmp.html");
const pdfFilePath = path.join(os.tmpdir(), "tmp.pdf");

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": 86400
};

module.exports = async (req, res) => {
  // enable cors
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  if (req.method === "GET") {
    try {
      const data = await readFile(pdfFilePath);
      res.setHeader("Content-Type", "application/pdf");
      res.end(data);
    } catch (err) {
      res.statusCode = 404;
      res.end(getErrStr(err));
    }
    return;
  }

  let body = "";

  req.on("data", chunk => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const { html } = JSON.parse(body);
      await writeFile(htmlFilePath, html);
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(`file://${htmlFilePath}`);
      const pdf = await page.pdf({ format: "A4" });
      await browser.close();
      await writeFile(pdfFilePath, pdf);
      res.statusCode = 200;
      res.end("success");
    } catch (err) {
      const message = getErrStr(err);
      res.statusCode = 500;
      res.end(message);
    }
  });
};

function getErrStr(err) {
  if (typeof err === "string") return err;
  if (typeof err === "object" && typeof err.message === "string")
    return err.message;
  return "";
}
