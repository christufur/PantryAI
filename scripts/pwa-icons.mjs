import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = path.join(root, "public/icons/icon.svg");

await sharp(svg).resize(192, 192).png().toFile(path.join(root, "public/icons/icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(path.join(root, "public/icons/icon-512.png"));
await sharp(svg).resize(180, 180).png().toFile(path.join(root, "public/icons/icon-180.png"));

console.log("Wrote public/icons/icon-192.png, icon-512.png, icon-180.png");
