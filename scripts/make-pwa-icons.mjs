import sharp from "sharp";
import fs from "fs";

const SOURCE = "public/icons/source.png";
const OUT = "public/icons";

if (!fs.existsSync(SOURCE)) {
  console.error("❌ Brak pliku source.png w public/icons");
  process.exit(1);
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Standard icons
await sharp(SOURCE).resize(192, 192).png().toFile(`${OUT}/icon-192.png`);
await sharp(SOURCE).resize(512, 512).png().toFile(`${OUT}/icon-512.png`);

// Maskable icon (logo w bezpiecznej strefie)
await sharp(SOURCE)
  .resize(360, 360)
  .extend({
    top: 76,
    bottom: 76,
    left: 76,
    right: 76,
    background: { r: 7, g: 13, b: 24, alpha: 1 }
  })
  .resize(512, 512)
  .png()
  .toFile(`${OUT}/maskable-icon.png`);

console.log("✅ PWA icons created:");
console.log(" - icon-192.png");
console.log(" - icon-512.png");
console.log(" - maskable-icon.png");
