import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(directory, "TugonBarangay_Project_Handbook.html"), "utf8");
const requiredSections = [
  "End-to-end functional flows",
  "API route map",
  "Data model and records",
  "Security, files, and operations",
  "Local development and verification",
];
for (const section of requiredSections) {
  if (!html.includes(section)) throw new Error(`Handbook section missing: ${section}`);
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rarr;/g, "->")
    .replace(/&amp;/g, "&")
    .replace(/&[a-zA-Z]+;/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, "->")
    .replace(/•/g, "*")
    .replace(/·/g, "|")
    .replace(/²/g, "2");
}

function htmlToLines(source) {
  const body = source.replace(/<head>[\s\S]*?<\/head>/i, "");
  const tokens = body
    .replace(/<section class="cover">([\s\S]*?)<\/section>/i, "$1\n<PAGEBREAK>\n")
    .replace(/<section class="section">/gi, "\n<PAGEBREAK>\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h1>/gi, "\n\n")
    .replace(/<h1[^>]*>/gi, "\n# ")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<h2[^>]*>/gi, "\n\n## ")
    .replace(/<\/h3>/gi, "\n\n")
    .replace(/<h3[^>]*>/gi, "\n### ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/td>/gi, " | ")
    .replace(/<\/th>/gi, " | ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/(?:section|ul|ol|table|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39|rarr);|&[a-zA-Z]+;/g, (entity) => decodeEntities(entity))
    .split(/\r?\n/)
    .map((line) => decodeEntities(line).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const result = [];
  for (const line of tokens) {
    const clean = line.replace(/\s+\|\s*$/, "");
    if (clean === "<PAGEBREAK>") {
      result.push("\f");
    } else if (clean.startsWith("## ")) {
      result.push("", "", clean.slice(3).toUpperCase(), "=".repeat(Math.min(88, clean.length - 3)));
    } else if (clean.startsWith("### ")) {
      result.push("", clean.slice(4));
    } else if (clean.startsWith("# ")) {
      result.push("", clean.slice(2));
    } else {
      result.push(clean);
    }
  }
  return result;
}

function wrap(text, maxChars = 98) {
  if (!text) return [""];
  const lines = [];
  while (text.length > maxChars) {
    let split = text.lastIndexOf(" ", maxChars);
    if (split < maxChars * 0.55) split = maxChars;
    lines.push(text.slice(0, split).trim());
    text = text.slice(split).trim();
  }
  lines.push(text);
  return lines;
}

const sourceLines = htmlToLines(html);
const pages = [];
let page = [];
for (const sourceLine of sourceLines) {
  if (sourceLine === "\f") {
    if (page.length) pages.push(page);
    page = [];
    continue;
  }
  for (const line of wrap(sourceLine)) {
    if (page.length >= 57) {
      pages.push(page);
      page = [];
    }
    page.push(line);
  }
}
if (page.length) pages.push(page);

const objects = [];
const addObject = (value) => (objects.push(value), objects.length);
const catalogId = addObject("");
const pagesId = addObject("");
const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
const pageIds = [];

function pdfText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
  const lines = pages[pageIndex];
  let commands = "BT\n/F1 8.5 Tf\n48 794 Td\n11.8 TL\n";
  lines.forEach((line, index) => {
    const isMainHeading = line.length > 3 && line === line.toUpperCase() && index > 0;
    const safeLine = pdfText(line);
    if (isMainHeading) commands += "/F1 11 Tf\n";
    commands += `(${safeLine}) Tj\nT*\n`;
    if (isMainHeading) commands += "/F1 8.5 Tf\n";
  });
  commands += "ET\nBT\n/F1 8 Tf\n48 25 Td\n(" + pdfText(`TugonBarangay Project Handbook | ${pageIndex + 1} / ${pages.length}`) + ") Tj\nET";
  const contentId = addObject(`<< /Length ${Buffer.byteLength(commands, "latin1")} >>\nstream\n${commands}\nendstream`);
  const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  pageIds.push(pageId);
}

objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n%TugonBarangay handbook\n";
const offsets = [0];
objects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
});
const xrefOffset = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

const outputPath = path.join(directory, "TugonBarangay_Project_Handbook.pdf");
if (!pdf.startsWith("%PDF-1.4") || !pdf.endsWith("%%EOF\n") || pages.length < 5) {
  throw new Error("Generated PDF failed its structure checks.");
}
fs.writeFileSync(outputPath, Buffer.from(pdf, "latin1"));
console.log(`Created ${outputPath} (${pages.length} pages).`);
