/* eslint-disable @typescript-eslint/no-require-imports -- a stand-alone CommonJS build script, see ../README.md */
// Images for the bilingual deck: laptop screens (jpg), floating cards and phone screens (rounded png). Reads the
// captures from ../shots, ../shots-en, ../mobile-fr, ../mobile-en and ../shots-sid (capture-*.mjs output).
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const S = path.resolve(__dirname, "..");
const desktop = [
  "a01-join",
  "a03-pending",
  "a04-onb-networking",
  "a04-onb-publish",
  "a05-home",
  "a06-directory",
  "a07b-profile-revealed",
  "a08-me",
  "a08b-visibility",
  "s01-dashboard",
  "s02-approvals",
  "s03-review",
  "s04-roster",
  "s05-record",
  "s06-staff",
  "s07-settings",
  "s08-templates",
  "s09-audit",
];
const cards = ["s02-approvals", "s04-roster", "s08-templates", "a08b-visibility", "a03-pending"];
const mobile = ["a05-home", "a06-directory", "a07b-profile-revealed", "a04-onb-networking"];
const rounded = async (src, w, r, out) => {
  const img = sharp(src).resize(w);
  const { height } = await img
    .clone()
    .toBuffer({ resolveWithObject: true })
    .then((x) => x.info);
  const mask = Buffer.from(
    `<svg width="${w}" height="${height}"><rect width="${w}" height="${height}" rx="${r}" ry="${r}"/></svg>`,
  );
  await img
    .composite([{ input: mask, blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toFile(out);
};
(async () => {
  for (const lang of ["fr", "en"]) {
    const dir = lang === "fr" ? "shots" : "shots-en";
    for (const d of [`img-${lang}`, `card-${lang}`, `m-${lang}`])
      fs.mkdirSync(path.join(__dirname, d), { recursive: true });
    for (const n of desktop)
      await sharp(path.join(S, dir, n + ".png"))
        .resize(1800)
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(path.join(__dirname, `img-${lang}`, n + ".jpg"));
    await sharp(path.join(S, "shots-sid", `a02-request-${lang}.png`))
      .resize(1800)
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(path.join(__dirname, `img-${lang}`, "a02-request.jpg"));
    for (const n of cards)
      await rounded(
        path.join(S, dir, n + ".png"),
        1300,
        22,
        path.join(__dirname, `card-${lang}`, n + ".png"),
      );
    for (const n of mobile)
      await rounded(
        path.join(S, `mobile-${lang}`, n + ".png"),
        620,
        70,
        path.join(__dirname, `m-${lang}`, n + ".png"),
      );
  }
  let t = 0;
  for (const d of ["img-fr", "img-en", "card-fr", "card-en", "m-fr", "m-en"])
    for (const f of fs.readdirSync(path.join(__dirname, d)))
      t += fs.statSync(path.join(__dirname, d, f)).size;
  console.log("images MB", (t / 1e6).toFixed(1));
})();
