/* eslint-disable @typescript-eslint/no-require-imports -- a stand-alone CommonJS build script, see ../README.md */
// Ad-style deck for École Maïmonide, in French or English: node build-deck.js fr|en <out.pptx>
// Needs pptxgenjs, react, react-dom, react-icons and sharp (not app dependencies), apply_theme.js from the pptx
// skill beside it, and the folders prepare-images.js writes (img-*, card-*, m-*) plus logo.png.
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fi = require("react-icons/fi");
const { applyTheme } = require("./apply_theme.js");

const LANG = process.argv[2] === "en" ? "en" : "fr";
const OUT = process.argv[3] || `deck-${LANG}.pptx`;
const X = (f, e) => (LANG === "fr" ? f : e);
const NB = " ";
const IMG = (n) => path.join(__dirname, `img-${LANG}`, n + ".jpg");
const CARD = (n) => path.join(__dirname, `card-${LANG}`, n + ".png");
const MOB = (n) => path.join(__dirname, `m-${LANG}`, n + ".png");
const SITE = "maimonide.alumninetwork.ca";

const THEME = {
  name: "Maïmonide",
  headFontFace: "Georgia",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "0B1F3A",
    lt1: "FFFFFF",
    dk2: "5B6B82",
    lt2: "EEF5FC",
    accent1: "0D51A1",
    accent2: "21BBED",
    accent3: "157898",
    accent4: "DCEBFA",
    accent5: "C97F12",
    accent6: "2E8B57",
    hlink: "0D51A1",
    folHlink: "157898",
  },
};
const HEX = THEME.colors;
const BEZEL = "1C2433";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = X("Le réseau des anciens de Maïmonide", "The Maïmonide alumni network");
pres.subject = X(
  "Présentation à l’École Maïmonide, 5 novembre 2026",
  "Presentation to École Maïmonide, November 5, 2026",
);
pres.author = "Alumni Network";
pres.company = "Alumni Network";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const S = pres.shapes;

// ---- Icons ------------------------------------------------------------------------------------------------
const cache = {};
async function ic(name, hex) {
  const k = name + hex;
  if (!cache[k]) {
    if (!fi[name]) throw new Error("no icon " + name);
    const svg = RDS.renderToStaticMarkup(React.createElement(fi[name], { size: 256 })).replace(
      /currentColor/g,
      "#" + hex,
    );
    cache[k] =
      "image/png;base64," +
      (await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer()).toString("base64");
  }
  return cache[k];
}
async function iconCircle(
  slide,
  name,
  x,
  y,
  d,
  { fill = C.accent4, color = HEX.accent1, id = name } = {},
) {
  slide.addShape(S.OVAL, {
    x,
    y,
    w: d,
    h: d,
    fill: { color: fill },
    line: { color: fill, width: 0.5 },
    objectName: `${id} circle`,
  });
  const p = d * 0.26;
  slide.addImage({
    data: await ic(name, color),
    x: x + p,
    y: y + p,
    w: d - 2 * p,
    h: d - 2 * p,
    objectName: `${id} icon`,
    altText: "",
  });
}

// ---- Layouts ----------------------------------------------------------------------------------------------
const FOOTER = X("Réseau des anciens de Maïmonide", "The Maïmonide alumni network");
const footer = [
  {
    text: {
      text: FOOTER,
      options: {
        x: 0.7,
        y: 7.02,
        w: 5,
        h: 0.28,
        fontSize: 10,
        color: C.text2,
        margin: 0,
        valign: "middle",
      },
    },
  },
];
const slideNumber = {
  x: 12.35,
  y: 7.02,
  w: 0.5,
  h: 0.28,
  fontSize: 10,
  color: C.text2,
  align: "right",
  margin: 0,
};
const titleOpts = (o) => ({
  name: "title",
  type: "title",
  fontFace: THEME.headFontFace,
  bold: true,
  valign: "top",
  align: "left",
  margin: 0,
  ...o,
});
pres.defineSlideMaster({
  title: "FEATURE",
  background: { color: HEX.lt1 },
  objects: [
    {
      placeholder: {
        options: titleOpts({ x: 0.7, y: 1.3, w: 5.3, h: 1.9, fontSize: 34, color: C.text1 }),
        text: "",
      },
    },
    ...footer,
  ],
  slideNumber,
});
pres.defineSlideMaster({
  title: "WIDE",
  background: { color: HEX.lt1 },
  objects: [
    {
      placeholder: {
        options: titleOpts({ x: 0.7, y: 1.05, w: 11.9, h: 1.35, fontSize: 38, color: C.text1 }),
        text: "",
      },
    },
    ...footer,
  ],
  slideNumber,
});
pres.defineSlideMaster({
  title: "COVER",
  background: { color: HEX.dk1 },
  objects: [
    {
      placeholder: {
        options: titleOpts({
          x: 0.75,
          y: 2.35,
          w: 6.2,
          h: 1.75,
          fontSize: 44,
          color: C.background1,
        }),
        text: "",
      },
    },
  ],
});
pres.defineSlideMaster({
  title: "DARK",
  background: { color: HEX.dk1 },
  objects: [
    {
      placeholder: {
        options: titleOpts({
          x: 0.75,
          y: 1.05,
          w: 11.8,
          h: 1.1,
          fontSize: 40,
          color: C.background1,
        }),
        text: "",
      },
    },
  ],
});
pres.defineSlideMaster({
  title: "BLUE",
  background: { color: HEX.accent1 },
  objects: [
    {
      placeholder: {
        options: titleOpts({ x: 0.75, y: 1.3, w: 6.6, h: 2.1, fontSize: 40, color: C.background1 }),
        text: "",
      },
    },
  ],
});
pres.defineSlideMaster({
  title: "SECTION",
  background: { color: HEX.accent1 },
  objects: [
    {
      placeholder: {
        options: titleOpts({
          x: 0.8,
          y: 2.55,
          w: 11.6,
          h: 1.0,
          fontSize: 44,
          color: C.background1,
          valign: "middle",
        }),
        text: "",
      },
    },
    {
      placeholder: {
        options: {
          name: "body",
          type: "body",
          x: 0.8,
          y: 3.55,
          w: 11.6,
          h: 0.6,
          fontSize: 20,
          color: C.accent4,
          valign: "top",
          align: "left",
          margin: 0,
        },
        text: "",
      },
    },
  ],
});

// ---- Building blocks --------------------------------------------------------------------------------------
const eyebrow = (slide, text, x, y, color = C.accent1, w = 6) =>
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.3,
    fontSize: 12,
    bold: true,
    charSpacing: 3,
    color,
    margin: 0,
    valign: "middle",
    isTextBox: true,
    objectName: "eyebrow",
  });
const shadow = (opacity = 0.28) => ({
  type: "outer",
  color: HEX.dk1,
  opacity,
  blur: 18,
  offset: 8,
  angle: 90,
});

function laptop(slide, img, x, y, w, alt) {
  const p = 0.14,
    sw = w - 2 * p,
    sh = sw / 1.6,
    lid = sh + 2 * p;
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x,
    y,
    w,
    h: lid,
    rectRadius: 0.12,
    fill: { color: BEZEL },
    line: { color: BEZEL, width: 0.5 },
    shadow: shadow(),
    objectName: `${img} laptop lid`,
  });
  slide.addImage({
    path: IMG(img),
    x: x + p,
    y: y + p,
    w: sw,
    h: sh,
    objectName: `${img} screen`,
    altText: alt,
  });
  const bw = w * 1.14,
    bx = x - (bw - w) / 2,
    by = y + lid - 0.01;
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: bx,
    y: by,
    w: bw,
    h: 0.17,
    rectRadius: 0.08,
    fill: { color: "D5DCE6" },
    line: { color: "C3CCD8", width: 0.5 },
    shadow: shadow(0.2),
    objectName: `${img} laptop base`,
  });
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: x + w / 2 - w * 0.09,
    y: by,
    w: w * 0.18,
    h: 0.06,
    rectRadius: 0.03,
    fill: { color: "B9C3D0" },
    line: { color: "B9C3D0", width: 0.25 },
    objectName: `${img} laptop notch`,
  });
  return lid + 0.17;
}
function phone(slide, img, x, y, w, alt) {
  const p = 0.08,
    iw = w - 2 * p,
    ih = iw / 0.462,
    h = ih + 2 * p;
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x,
    y,
    w,
    h,
    rectRadius: 0.26,
    fill: { color: BEZEL },
    line: { color: BEZEL, width: 0.5 },
    shadow: shadow(0.32),
    objectName: `${img} phone body`,
  });
  slide.addImage({
    path: MOB(img),
    x: x + p,
    y: y + p,
    w: iw,
    h: ih,
    objectName: `${img} phone screen`,
    altText: alt,
  });
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: x + w / 2 - w * 0.16,
    y: y + p + 0.05,
    w: w * 0.32,
    h: 0.09,
    rectRadius: 0.045,
    fill: { color: BEZEL },
    line: { color: BEZEL, width: 0.25 },
    objectName: `${img} phone notch`,
  });
  return h;
}
function card(slide, img, x, y, w, alt) {
  const h = w / 1.6;
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: C.background1 },
    line: { color: "C9DBF1", width: 0.75 },
    shadow: shadow(0.25),
    objectName: `${img} card`,
  });
  slide.addImage({ path: CARD(img), x, y, w, h, objectName: `${img} card image`, altText: alt });
}
const stage = (slide) =>
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: 6.35,
    y: 0.45,
    w: 6.5,
    h: 6.45,
    rectRadius: 0.25,
    fill: { color: C.background2 },
    line: { color: C.background2, width: 0.5 },
    objectName: "stage",
  });

// Feature slide: eyebrow, headline, one line, three callouts, and a device on the stage.
async function feature({ chip, title, sub, callouts, device, notes, badge }) {
  const s = pres.addSlide({ masterName: "FEATURE", sectionTitle: section });
  eyebrow(s, chip, 0.7, 0.95);
  s.addText(title, { placeholder: "title" });
  if (sub)
    s.addText(sub, {
      x: 0.7,
      y: 3.3,
      w: 5.1,
      h: 0.85,
      fontSize: 17,
      color: C.text2,
      margin: 0,
      valign: "top",
      isTextBox: true,
      objectName: "subhead",
    });
  for (let i = 0; i < (callouts ?? []).length; i++) {
    const [ico, label, desc] = callouts[i];
    const y = 4.35 + i * 0.78;
    await iconCircle(s, ico, 0.7, y, 0.48, { id: `callout ${i + 1}` });
    s.addText(
      [
        { text: label, options: { fontSize: 15, bold: true, color: C.text1, breakLine: true } },
        { text: desc, options: { fontSize: 14, color: C.text2 } },
      ],
      {
        x: 1.36,
        y: y - 0.04,
        w: 4.5,
        h: 0.72,
        margin: 0,
        valign: "top",
        isTextBox: true,
        objectName: `callout text ${i + 1}`,
      },
    );
  }
  stage(s);
  await device(s);
  if (badge)
    s.addText(badge, {
      shape: S.ROUNDED_RECTANGLE,
      x: 12.55 - (0.3 + badge.length * 0.095),
      y: 4.75,
      w: 0.3 + badge.length * 0.095,
      h: 0.38,
      rectRadius: 0.19,
      fill: { color: C.accent2 },
      line: { color: C.accent2, width: 0.5 },
      fontSize: 13,
      bold: true,
      color: C.text1,
      align: "center",
      valign: "middle",
      margin: 0,
      objectName: "new badge",
    });
  s.addNotes(notes);
  return s;
}
const laptopOnly = (img, alt) => (s) => laptop(s, img, 6.85, 1.72, 5.5, alt);
const laptopPhone = (img, mob, alt, altM) => (s) => {
  laptop(s, img, 6.75, 1.2, 5.25, alt);
  phone(s, mob, 11.0, 3.3, 1.58, altM);
};
const laptopCard = (img, cardImg, alt, altC) => (s) => {
  laptop(s, img, 7.35, 0.85, 5.1, alt);
  card(s, cardImg, 6.6, 4.55, 3.4, altC);
};

let section = "";
const newSection = (fr, en) => {
  section = X(fr, en);
  pres.addSection({ title: section });
};

// ---- Slides -----------------------------------------------------------------------------------------------
(async () => {
  // 1. Cover -------------------------------------------------------------------------------------------------
  newSection("Introduction", "Introduction");
  let s = pres.addSlide({ masterName: "COVER", sectionTitle: section });
  s.addShape(S.OVAL, {
    x: 7.2,
    y: -0.6,
    w: 7.4,
    h: 7.4,
    fill: { color: C.accent1, transparency: 45 },
    line: { color: C.accent1, width: 0.5, transparency: 45 },
    objectName: "glow",
  });
  s.addShape(S.OVAL, {
    x: 10.9,
    y: 4.6,
    w: 3.2,
    h: 3.2,
    fill: { color: C.accent2, transparency: 78 },
    line: { color: C.accent2, width: 0.5, transparency: 78 },
    objectName: "glow small",
  });
  s.addShape(S.ROUNDED_RECTANGLE, {
    x: 0.75,
    y: 0.7,
    w: 0.95,
    h: 0.95,
    rectRadius: 0.16,
    fill: { color: C.background1 },
    line: { color: C.background1, width: 0.5 },
    objectName: "logo tile",
  });
  s.addImage({
    path: path.join(__dirname, "logo.png"),
    x: 0.84,
    y: 0.79,
    w: 0.77,
    h: 0.77,
    objectName: "logo",
    altText: X("Emblème de l’École Maïmonide", "École Maïmonide emblem"),
  });
  eyebrow(
    s,
    X("RÉSEAU DES ANCIENS DE MAÏMONIDE", "THE MAÏMONIDE ALUMNI NETWORK"),
    0.75,
    1.95,
    C.accent2,
  );
  s.addText(X("Chaque promotion.\nUn seul réseau.", "Every class.\nOne network."), {
    placeholder: "title",
  });
  s.addText(
    X(
      "La plateforme privée qui garde vos diplômés liés à l’école, et entre eux.",
      "The private platform that keeps your graduates connected to the school, and to each other.",
    ),
    {
      x: 0.75,
      y: 4.35,
      w: 5.7,
      h: 1.0,
      fontSize: 20,
      color: C.accent4,
      margin: 0,
      valign: "top",
      isTextBox: true,
      objectName: "subline",
    },
  );
  s.addText(
    X(
      "Présentation à l’École Maïmonide · 5 novembre 2026",
      "Presentation to École Maïmonide · November 5, 2026",
    ),
    {
      x: 0.75,
      y: 6.6,
      w: 6,
      h: 0.35,
      fontSize: 14,
      color: C.accent4,
      margin: 0,
      isTextBox: true,
      objectName: "date",
    },
  );
  laptop(s, "a05-home", 6.95, 1.45, 5.6, X("Accueil d’une ancienne", "An alumna’s home page"));
  phone(
    s,
    "a06-directory",
    11.15,
    3.4,
    1.62,
    X("Répertoire sur téléphone", "The directory on a phone"),
  );
  s.addNotes(
    X(
      "Bonjour et merci de nous recevoir. Nous construisons une plateforme pour les écoles : un réseau privé où les anciens se retrouvent, s’entraident et restent liés à leur école. Tout ce que vous verrez est déjà aux couleurs de Maïmonide, en français ; les personnes affichées sont fictives. D’abord le pourquoi, puis le parcours d’un ancien, celui de l’école, et une démo en direct pour finir.",
      "Hello and thank you for having us. We are building a platform for schools: a private network where alumni find each other, help each other and stay connected to their school. Everything you will see is already in Maïmonide’s colours; the people shown are fictional. First the why, then a graduate’s journey, the school’s side, and a live demo to finish.",
    ),
  );

  // 2. Problem -----------------------------------------------------------------------------------------------
  s = pres.addSlide({ masterName: "WIDE", sectionTitle: section });
  eyebrow(s, X("LE CONSTAT", "THE PROBLEM"), 0.7, 0.72);
  s.addText(
    X(
      "Le jour de la remise des diplômes, le lien commence à se défaire.",
      "On graduation day, the connection starts to fade.",
    ),
    { placeholder: "title" },
  );
  const problems = [
    [
      "FiMapPin",
      X("Dispersés", "Scattered"),
      X(
        `Montréal, Paris, Tel-Aviv, New York${NB}: l’école perd la trace de ses anciens.`,
        "Montreal, Paris, Tel Aviv, New York: the school loses track of its alumni.",
      ),
    ],
    [
      "FiDatabase",
      X("Introuvables", "Out of reach"),
      X(
        `Courriels périmés, noms changés après le mariage${NB}: les listes vieillissent.`,
        "Old emails, names changed after marriage: alumni lists go stale.",
      ),
    ],
    [
      "FiGlobe",
      X("Trop publics", "Too public"),
      X(
        `Sur LinkedIn, impossible de trouver «${NB}les anciens de Maïmonide prêts à aider${NB}».`,
        "LinkedIn can’t show you “Maïmonide alumni who want to help”.",
      ),
    ],
    [
      "FiHeart",
      X("Inexploités", "Untapped"),
      X(
        "Beaucoup d’anciens veulent aider, mais personne ne sait qui solliciter.",
        "Many alumni want to help, but nobody knows whom to ask.",
      ),
    ],
  ];
  for (let i = 0; i < problems.length; i++) {
    const [ico, head, body] = problems[i];
    const x = 0.7 + i * 3.05,
      y = 2.85,
      w = 2.85,
      h = 3.45;
    s.addShape(S.ROUNDED_RECTANGLE, {
      x,
      y,
      w,
      h,
      rectRadius: 0.16,
      fill: { color: C.background2 },
      line: { color: C.background2, width: 0.5 },
      objectName: `problem ${i + 1}`,
    });
    await iconCircle(s, ico, x + 0.3, y + 0.35, 0.72, { id: `problem ${i + 1}` });
    s.addText(head, {
      x: x + 0.3,
      y: y + 1.35,
      w: w - 0.6,
      h: 0.5,
      fontFace: THEME.headFontFace,
      fontSize: 22,
      bold: true,
      color: C.text1,
      margin: 0,
      valign: "middle",
      isTextBox: true,
      objectName: `problem head ${i + 1}`,
    });
    s.addText(body, {
      x: x + 0.3,
      y: y + 1.95,
      w: w - 0.6,
      h: 1.35,
      fontSize: 15,
      color: C.text1,
      margin: 0,
      valign: "top",
      isTextBox: true,
      objectName: `problem body ${i + 1}`,
    });
  }
  s.addNotes(
    X(
      "Le constat est simple. À la sortie de l’école, les anciens partent dans toutes les directions et les listes vieillissent vite : les courriels changent, beaucoup de femmes changent de nom après le mariage. LinkedIn est public et impersonnel : on ne peut pas y chercher les anciens de Maïmonide qui veulent aider. Et pourtant, beaucoup d’anciens aimeraient rendre à l’école et aux plus jeunes. Il manque un lieu pour ça.",
      "The problem is simple. After graduation, alumni scatter and lists go stale fast: emails change, and many women change their name after marriage. LinkedIn is public and impersonal: you can’t search for Maïmonide alumni who want to help. Yet many alumni would love to give back to the school and to younger graduates. What’s missing is a place for it.",
    ),
  );

  // 3. Answer ------------------------------------------------------------------------------------------------
  s = pres.addSlide({ masterName: "BLUE", sectionTitle: section });
  s.addShape(S.OVAL, {
    x: 7.6,
    y: 0.2,
    w: 6.4,
    h: 6.4,
    fill: { color: C.accent2, transparency: 82 },
    line: { color: C.accent2, width: 0.5, transparency: 82 },
    objectName: "glow",
  });
  eyebrow(s, X("NOTRE RÉPONSE", "OUR ANSWER"), 0.75, 0.95, C.accent4);
  s.addText(
    X("Un réseau privé, vérifié, à vos couleurs.", "A private network, verified, in your colours."),
    { placeholder: "title" },
  );
  const pillars = [
    [
      "FiLock",
      X("Privé", "Private"),
      X(
        "Seuls les anciens approuvés voient l’annuaire.",
        "Only approved alumni see the directory.",
      ),
    ],
    [
      "FiUserCheck",
      X("Vérifié", "Verified"),
      X("L’école approuve chaque inscription.", "The school approves every sign-up."),
    ],
    [
      "FiStar",
      X("À vos couleurs", "Your brand"),
      X("Votre adresse, votre logo, vos couleurs.", "Your address, your logo, your colours."),
    ],
  ];
  for (let i = 0; i < pillars.length; i++) {
    const [ico, head, body] = pillars[i];
    const y = 3.8 + i * 0.82;
    await iconCircle(s, ico, 0.75, y, 0.56, {
      fill: C.background1,
      color: HEX.accent1,
      id: `pillar ${i + 1}`,
    });
    s.addText(
      [
        {
          text: head,
          options: { fontSize: 17, bold: true, color: C.background1, breakLine: true },
        },
        { text: body, options: { fontSize: 15, color: C.accent4 } },
      ],
      {
        x: 1.5,
        y: y - 0.04,
        w: 5.4,
        h: 0.75,
        margin: 0,
        valign: "top",
        isTextBox: true,
        objectName: `pillar text ${i + 1}`,
      },
    );
  }
  s.addText(SITE, {
    shape: S.ROUNDED_RECTANGLE,
    x: 0.75,
    y: 6.45,
    w: 3.6,
    h: 0.42,
    rectRadius: 0.21,
    fill: { color: C.text1 },
    line: { color: C.text1, width: 0.5 },
    fontSize: 14,
    bold: true,
    color: C.accent2,
    align: "center",
    valign: "middle",
    margin: 0,
    objectName: "address",
  });
  phone(s, "a06-directory", 7.85, 1.75, 2.15, X("Répertoire", "Directory"));
  phone(
    s,
    "a07b-profile-revealed",
    10.35,
    0.95,
    2.15,
    X("Profil d’un ancien", "An alum’s profile"),
  );
  s.addNotes(
    X(
      "Notre réponse : un réseau professionnel privé, réservé aux diplômés de Maïmonide, à sa propre adresse. Privé, parce que seuls les anciens approuvés voient l’annuaire. Vérifié, parce que c’est l’école qui approuve chaque inscription. À vos couleurs : votre logo, vos couleurs, et le français comme langue par défaut. Et ça fonctionne aussi bien sur téléphone.",
      "Our answer: a private professional network for Maïmonide graduates only, at its own address. Private, because only approved alumni see the directory. Verified, because the school approves every sign-up. In your colours: your logo, your colours, and French as the default language. And it works just as well on a phone.",
    ),
  );

  // 4. Benefits ----------------------------------------------------------------------------------------------
  s = pres.addSlide({ masterName: "WIDE", sectionTitle: section });
  eyebrow(s, X("CE QUE CHACUN Y GAGNE", "WHO BENEFITS"), 0.7, 0.72);
  s.addText(X("Une communauté plus forte, pour tous.", "A stronger community, for everyone."), {
    placeholder: "title",
  });
  const gains = [
    [
      "FiUsers",
      X("Pour les anciens", "For alumni"),
      X(
        [
          "Retrouver ses camarades de promotion",
          "Trouver un mentor, un stage, un emploi",
          "Offrir son aide et rester lié à l’école",
        ],
        [
          "Reconnect with classmates",
          "Find a mentor, an internship, a job",
          "Give back and stay close to the school",
        ],
      ),
    ],
    [
      "FiBookOpen",
      X("Pour l’école", "For the school"),
      X(
        [
          "Une liste tenue à jour par les anciens eux‑mêmes",
          "Savoir où sont vos diplômés et ce qu’ils font",
          `Une communauté à mobiliser${NB}: événements, conférences, philanthropie`,
        ],
        [
          "An alumni list the alumni keep up to date",
          "Know where your graduates are and what they do",
          "A community to rally: events, speakers, philanthropy",
        ],
      ),
    ],
    [
      "FiCompass",
      X("Pour les élèves", "For students"),
      X(
        [
          "Des anciens qui parlent de leur métier",
          "Des journées d’observation et des stages",
          "Chaque ancien indique comment il peut aider",
        ],
        [
          "Alumni who talk about their careers",
          "Job shadowing days and internships",
          "Every alum says how they can help",
        ],
      ),
    ],
  ];
  for (let i = 0; i < gains.length; i++) {
    const [ico, head, items] = gains[i];
    const x = 0.7 + i * 4.07,
      y = 2.5,
      w = 3.85,
      h = 4.25;
    s.addShape(S.ROUNDED_RECTANGLE, {
      x,
      y,
      w,
      h,
      rectRadius: 0.16,
      fill: { color: C.background2 },
      line: { color: C.background2, width: 0.5 },
      objectName: `gain ${i + 1}`,
    });
    await iconCircle(s, ico, x + 0.35, y + 0.35, 0.72, { id: `gain ${i + 1}` });
    s.addText(head, {
      x: x + 0.35,
      y: y + 1.25,
      w: w - 0.7,
      h: 0.5,
      fontFace: THEME.headFontFace,
      fontSize: 21,
      bold: true,
      color: C.text1,
      margin: 0,
      valign: "middle",
      isTextBox: true,
      objectName: `gain head ${i + 1}`,
    });
    s.addText(
      items.map((t, j) => ({
        text: t,
        options: {
          bullet: { indent: 16 },
          paraSpaceAfter: 12,
          ...(j < items.length - 1 ? { breakLine: true } : {}),
        },
      })),
      {
        x: x + 0.35,
        y: y + 1.9,
        w: w - 0.7,
        h: 2.25,
        fontSize: 16,
        color: C.text1,
        margin: 0,
        valign: "top",
        isTextBox: true,
        objectName: `gain list ${i + 1}`,
      },
    );
  }
  s.addNotes(
    X(
      "Pour les anciens : retrouver leurs camarades, trouver de l’aide pour leur carrière, et offrir la leur. Pour l’école : une liste d’anciens vivante que les anciens tiennent à jour eux-mêmes, et une communauté à mobiliser. Pour les élèves : chaque ancien peut dire s’il accepte de parler de son métier, d’accueillir un élève en observation ou d’offrir un stage. Un accès direct des élèves n’existe pas encore ; c’est une piste pour plus tard.",
      "For alumni: reconnecting with classmates, getting career help, and offering theirs. For the school: a living alumni list that the alumni keep up to date themselves, and a community to rally. For students: every alum can say whether they will talk about their job, host a student for a day or offer an internship. Direct student access doesn’t exist yet; it’s an idea for later.",
    ),
  );

  // 5. Privacy -----------------------------------------------------------------------------------------------
  s = pres.addSlide({ masterName: "DARK", sectionTitle: section });
  eyebrow(s, X("CONFIDENTIALITÉ", "PRIVACY"), 0.75, 0.72, C.accent2);
  s.addText(X("La confiance, dès la conception.", "Trust, by design."), { placeholder: "title" });
  const privacy = [
    [
      "FiEye",
      X("L’ancien décide", "Alumni decide"),
      X(
        "Ce qu’il montre, et s’il apparaît dans l’annuaire.",
        "What they show, and whether they appear at all.",
      ),
    ],
    [
      "FiMail",
      X("Contact maîtrisé", "Controlled contact"),
      X(
        "Courriel et téléphone affichés sur demande, et consignés.",
        "Email and phone shown on request, and logged.",
      ),
    ],
    [
      "FiShield",
      X("Écoles isolées", "Schools kept apart"),
      X("Les données de Maïmonide restent à Maïmonide.", "Maïmonide’s data stays with Maïmonide."),
    ],
    [
      "FiFileText",
      X("Journal d’audit", "Audit log"),
      X(
        "Chaque décision est enregistrée, sans retouche possible.",
        "Every decision is recorded and can’t be altered.",
      ),
    ],
    [
      "FiServer",
      X("Hébergé au Canada", "Hosted in Canada"),
      X(
        "Région de Montréal, ce qui facilite la conformité à la Loi 25.",
        "Montreal region, which eases Law 25 compliance.",
      ),
    ],
    [
      "FiLifeBuoy",
      X("Notre accès, encadré", "Our access, limited"),
      X(
        "Une raison, 8 heures au plus, visible dans votre journal.",
        "A stated reason, 8 hours at most, shown in your log.",
      ),
    ],
  ];
  for (let i = 0; i < privacy.length; i++) {
    const [ico, head, body] = privacy[i];
    const x = 0.75 + (i % 3) * 4.05,
      y = 2.55 + Math.floor(i / 3) * 2.15,
      w = 3.8,
      h = 1.9;
    s.addShape(S.ROUNDED_RECTANGLE, {
      x,
      y,
      w,
      h,
      rectRadius: 0.14,
      fill: { color: "13305A" },
      line: { color: "1E4374", width: 0.75 },
      objectName: `privacy ${i + 1}`,
    });
    await iconCircle(s, ico, x + 0.3, y + 0.3, 0.6, {
      fill: C.accent1,
      color: "BFE9FA",
      id: `privacy ${i + 1}`,
    });
    s.addText(head, {
      x: x + 1.1,
      y: y + 0.3,
      w: w - 1.3,
      h: 0.6,
      fontSize: 18,
      bold: true,
      color: C.background1,
      margin: 0,
      valign: "middle",
      isTextBox: true,
      objectName: `privacy head ${i + 1}`,
    });
    s.addText(body, {
      x: x + 0.3,
      y: y + 1.05,
      w: w - 0.6,
      h: 0.75,
      fontSize: 15,
      color: C.accent4,
      margin: 0,
      valign: "top",
      isTextBox: true,
      objectName: `privacy body ${i + 1}`,
    });
  }
  s.addNotes(
    X(
      "Pour une école, la confidentialité n’est pas négociable, alors nous l’avons mise au centre. Chaque ancien décide de ce qu’il montre et peut se masquer à tout moment. Ses coordonnées ne s’affichent qu’à la demande, une personne à la fois, et c’est consigné. Chaque école est isolée des autres : c’est la base de données elle-même qui l’impose. Les données sont hébergées au Canada, dans la région de Montréal. Et si notre équipe doit intervenir pour du soutien, il lui faut une raison, l’accès dure 8 heures au plus et il apparaît dans votre journal d’audit.",
      "For a school, privacy is not negotiable, so we put it at the centre. Each alum decides what they show and can hide at any time. Contact details appear only on request, one person at a time, and that is logged. Each school is isolated from the others: the database itself enforces it. The data is hosted in Canada, in the Montreal region. And if our team needs to step in for support, it needs a stated reason, access lasts 8 hours at most, and it shows up in your audit log.",
    ),
  );

  // 6. Section: alumni ---------------------------------------------------------------------------------------
  newSection("Parcours de l’ancien", "Alumni journey");
  s = pres.addSlide({ masterName: "SECTION", sectionTitle: section });
  s.addText("01", {
    x: 0.8,
    y: 0.8,
    w: 3,
    h: 1.5,
    fontFace: THEME.headFontFace,
    fontSize: 96,
    bold: true,
    color: C.accent2,
    margin: 0,
    isTextBox: true,
    objectName: "section number",
  });
  s.addText(X("Le parcours d’un ancien", "A graduate’s journey"), { placeholder: "title" });
  s.addText(
    X("De l’inscription à la première prise de contact", "From sign-up to the first introduction"),
    { placeholder: "body" },
  );
  const steps = X(
    [
      "Créer un compte",
      "Demander l’accès",
      "Approbation par l’école",
      "Créer son profil",
      "Trouver et contacter",
    ],
    [
      "Create an account",
      "Request access",
      "School approval",
      "Build a profile",
      "Find and connect",
    ],
  );
  s.addShape(S.LINE, {
    x: 1.25,
    y: 5.15,
    w: 10.4,
    h: 0,
    line: { color: C.accent4, width: 1.5, transparency: 40 },
    objectName: "timeline",
  });
  for (let i = 0; i < steps.length; i++) {
    const cx = 1.25 + i * 2.6;
    s.addText(String(i + 1), {
      shape: S.OVAL,
      x: cx - 0.36,
      y: 4.79,
      w: 0.72,
      h: 0.72,
      fill: { color: C.background1 },
      line: { color: C.background1, width: 0.5 },
      fontFace: THEME.headFontFace,
      fontSize: 22,
      bold: true,
      color: C.accent1,
      align: "center",
      valign: "middle",
      margin: 0,
      objectName: `step ${i + 1}`,
    });
    s.addText(steps[i], {
      x: cx - 1.2,
      y: 5.7,
      w: 2.4,
      h: 0.7,
      fontSize: 16,
      bold: true,
      color: C.background1,
      align: "center",
      valign: "top",
      margin: 0,
      isTextBox: true,
      objectName: `step label ${i + 1}`,
    });
  }
  s.addNotes(
    X(
      "Le parcours d’un ancien, en cinq étapes : il crée son compte, se présente à l’école, l’école l’approuve, il crée son profil, puis il cherche et contacte d’autres anciens.",
      "A graduate’s journey in five steps: they create an account, introduce themselves to the school, the school approves them, they build a profile, then they find and contact other alumni.",
    ),
  );

  const A = X("ANCIEN", "ALUMNI");
  await feature({
    chip: X(`ÉTAPE 1 · ${A}`, `STEP 1 · ${A}`),
    title: X("Rejoindre, en une minute.", "Join in a minute."),
    sub: X(
      "Un seul lien, partagé par l’école dans son infolettre ou sur ses réseaux.",
      "One link, shared by the school in its newsletter or on social media.",
    ),
    callouts: [
      [
        "FiMail",
        X("Courriel confirmé", "Confirmed email"),
        X("Chaque compte vérifie son adresse.", "Every account verifies its address."),
      ],
      [
        "FiLock",
        X("Rien n’est ouvert", "Nothing unlocked"),
        X("Créer un compte ne donne accès à rien.", "An account alone grants no access."),
      ],
      [
        "FiGlobe",
        X("Français ou anglais", "French or English"),
        X("Au choix, sur chaque page.", "On every page."),
      ],
    ],
    device: laptopOnly("a01-join", X("Création de compte", "Account creation")),
    notes: X(
      "L’école diffuse un seul lien. L’ancien crée un compte avec son courriel et un mot de passe, puis confirme son adresse. Créer un compte ne donne accès à rien : c’est l’école qui décide qui entre.",
      "The school shares a single link. The graduate creates an account with an email and password, then confirms the address. An account alone grants nothing: the school decides who gets in.",
    ),
  });

  await feature({
    chip: X(`ÉTAPE 2 · ${A}`, `STEP 2 · ${A}`),
    title: X("Se présenter à l’école.", "Introduce yourself to the school."),
    sub: X(
      "Nom, nom à l’école, année de promotion et une note libre.",
      "Name, name at school, class year and a short note.",
    ),
    badge: X("Nouveau : matricule", "New: student ID"),
    callouts: [
      [
        "FiHash",
        X("Matricule facultatif", "Optional student ID"),
        X(
          "S’il s’en souvient, l’école retrouve son dossier plus vite.",
          "If they remember it, the school finds their record faster.",
        ),
      ],
      [
        "FiUsers",
        X("Nom de jeune fille", "Maiden name"),
        X(
          "Pour reconnaître ceux qui ont changé de nom.",
          "To recognise graduates who changed their name.",
        ),
      ],
      [
        "FiLock",
        X("Annuaire verrouillé", "Directory locked"),
        X("Jusqu’à l’approbation de l’école.", "Until the school approves."),
      ],
    ],
    device: laptopCard(
      "a02-request",
      "a03-pending",
      X("Demande d’accès avec matricule", "Access request with student ID"),
      X("Demande en attente", "Pending request"),
    ),
    notes: X(
      "L’ancien se présente : son nom, son nom à l’école s’il a changé, son année de promotion et une note. Nouveau dans la prochaine version : il peut indiquer son matricule, s’il s’en souvient. Ce n’est qu’un indice : le réviseur voit si le matricule correspond à un dossier, et c’est toujours une personne qui approuve. Pendant l’attente, l’annuaire reste fermé.",
      "The graduate introduces themselves: name, name at school if it changed, class year and a note. New in the next version: they can give their student ID if they remember it. It is only a hint: the reviewer sees whether it matches a record, and a person still approves every request. While they wait, the directory stays locked.",
    ),
  });

  await feature({
    chip: X(`ÉTAPE 3 · ${A}`, `STEP 3 · ${A}`),
    title: X("Un profil qui dit comment aider.", "A profile that says how to help."),
    sub: X(
      "Sept courtes étapes, enregistrées au fur et à mesure.",
      "Seven short steps, saved as you go.",
    ),
    callouts: [
      [
        "FiHeart",
        X("Mentorat, stages, observation", "Mentoring, internships, shadowing"),
        X("L’ancien choisit comment il veut aider.", "Alumni choose how they want to help."),
      ],
      [
        "FiEyeOff",
        X("Masqué par défaut", "Hidden by default"),
        X("Rien n’est publié sans son accord.", "Nothing is published without consent."),
      ],
      [
        "FiCheckCircle",
        X("Consentement clair", "Clear consent"),
        X("Il accepte la politique avant de publier.", "They accept the policy before publishing."),
      ],
    ],
    device: laptopPhone(
      "a04-onb-networking",
      "a04-onb-networking",
      X("Étape Réseautage", "Networking step"),
      X("Sur téléphone", "On a phone"),
    ),
    notes: X(
      "Une fois approuvé, l’ancien crée son profil en sept courtes étapes. L’étape clé : « Comment aimeriez-vous aider ? » Mentorat, conseils, stages, observation, conférences, aide aux élèves. C’est ce qui transforme un annuaire en réseau d’entraide. À la fin, l’ancien choisit lui-même s’il apparaît dans l’annuaire.",
      "Once approved, the graduate builds a profile in seven short steps. The key one: “How would you like to help?” Mentoring, career advice, internships, job shadowing, talks, helping students. That is what turns a directory into a network of mutual help. At the end, they choose for themselves whether to appear in the directory.",
    ),
  });

  await feature({
    chip: X(`ÉTAPE 4 · ${A}`, `STEP 4 · ${A}`),
    title: X(
      "Un accueil qui donne envie de reprendre contact.",
      "A home page that invites reconnection.",
    ),
    sub: X(
      "Sa promotion, les nouveaux membres et ceux qui offrent leur aide.",
      "Their class, new members, and who is offering help.",
    ),
    callouts: [
      [
        "FiSearch",
        X("Recherche", "Search"),
        X("Par nom, poste ou employeur.", "By name, job title or employer."),
      ],
      [
        "FiUsers",
        X("Sa promotion", "Their class"),
        X("Ce que deviennent ses camarades.", "What classmates are up to."),
      ],
      [
        "FiSmartphone",
        X("Sur téléphone", "On mobile"),
        X("Le site s’adapte à tous les écrans.", "Works on every screen."),
      ],
    ],
    device: laptopPhone(
      "a05-home",
      "a05-home",
      X("Accueil", "Home page"),
      X("Accueil sur téléphone", "Home page on a phone"),
    ),
    notes: X(
      "Voici l’accueil de Yaël, promotion 2008. Elle voit ses camarades de promotion et les nouveaux membres, cherche par nom, poste ou employeur, ou clique directement sur « Mentorat » pour voir qui est disponible.",
      "This is Yaël’s home page, class of 2008. She sees her classmates and new members, searches by name, job title or employer, or clicks “Mentoring” to see who is available.",
    ),
  });

  await feature({
    chip: X(`ÉTAPE 5 · ${A}`, `STEP 5 · ${A}`),
    title: X("Trouver la bonne personne, en deux clics.", "Find the right person in two clicks."),
    sub: X(
      "Un répertoire privé, par domaine, ville, université et promotion.",
      "A private directory by field, city, university and class.",
    ),
    callouts: [
      [
        "FiFilter",
        X(`«${NB}Disponible pour${NB}»`, "“Open to”"),
        X(
          "Mentorat, recrutement, stages, observation…",
          "Mentoring, hiring, internships, shadowing…",
        ),
      ],
      [
        "FiEye",
        X("Profils publiés seulement", "Published profiles only"),
        X("L’ancien choisit d’y apparaître.", "Alumni choose to appear."),
      ],
      [
        "FiGlobe",
        X("Partout dans le monde", "Worldwide"),
        X("Montréal, Paris, Tel-Aviv, New York…", "Montreal, Paris, Tel Aviv, New York…"),
      ],
    ],
    device: laptopPhone(
      "a06-directory",
      "a06-directory",
      X("Répertoire", "Directory"),
      X("Répertoire sur téléphone", "Directory on a phone"),
    ),
    notes: X(
      "Le répertoire permet de croiser les critères : par exemple, les anciens en médecine à Montréal qui offrent du mentorat. Seuls les anciens qui ont choisi de publier leur profil y apparaissent.",
      "The directory combines criteria: for example, alumni in medicine in Montreal who offer mentoring. Only alumni who chose to publish their profile appear.",
    ),
  });

  await feature({
    chip: X(`ÉTAPE 6 · ${A}`, `STEP 6 · ${A}`),
    title: X("Entrer en contact, en toute confiance.", "Reach out, with confidence."),
    sub: X(
      "Le parcours, la formation, et comment chacun veut aider.",
      "Career, education, and how each person wants to help.",
    ),
    callouts: [
      [
        "FiMail",
        X("Courriel sur demande", "Email on request"),
        X("Un profil à la fois.", "One profile at a time."),
      ],
      [
        "FiFileText",
        X("Consigné", "Logged"),
        X(
          "Le bureau des anciens sait qui a demandé quoi.",
          "The alumni office knows who asked for what.",
        ),
      ],
      [
        "FiLinkedin",
        X("Ses canaux", "Their channels"),
        X(
          `LinkedIn, courriel, téléphone${NB}: il choisit.`,
          "LinkedIn, email, phone: they choose.",
        ),
      ],
    ],
    device: (sl) =>
      phone(
        sl,
        "a07b-profile-revealed",
        8.35,
        1.0,
        2.5,
        X("Profil avec courriel affiché", "Profile with email shown"),
      ),
    notes: X(
      "Sur un profil, on voit le parcours de la personne et comment elle souhaite aider. Pour écrire, on clique sur « Afficher le courriel » : l’adresse apparaît, et c’est consigné. Cela décourage la collecte d’adresses et rassure ceux qui partagent leurs coordonnées.",
      "A profile shows the person’s career and how they want to help. To write, you click “Show email”: the address appears, and that is logged. It discourages address harvesting and reassures those who share their details.",
    ),
  });

  await feature({
    chip: X(`EN TOUT TEMPS · ${A}`, `ANY TIME · ${A}`),
    title: X("Mon profil, mes règles.", "My profile, my rules."),
    sub: X(
      "L’ancien garde la main sur ses renseignements.",
      "Alumni stay in control of their information.",
    ),
    callouts: [
      [
        "FiEdit3",
        X("Tout modifier", "Edit anything"),
        X("Chaque section, à tout moment.", "Every section, any time."),
      ],
      ["FiEyeOff", X("Se masquer", "Go hidden"), X("En un clic.", "In one click.")],
      [
        "FiDownload",
        X("Ses données", "Their data"),
        X("Les télécharger, ou supprimer son compte.", "Download it, or delete the account."),
      ],
    ],
    device: laptopCard(
      "a08-me",
      "a08b-visibility",
      X("Mon profil", "My profile"),
      X("Choix de la visibilité", "Visibility choice"),
    ),
    notes: X(
      "Dans « Mon profil », l’ancien modifie chaque section quand il veut, change sa visibilité en un clic et choisit les coordonnées qu’il partage. Il peut aussi télécharger ses données ou supprimer son compte. Ce contrôle donne confiance pour s’inscrire.",
      "In “My profile”, alumni edit any section whenever they like, change their visibility in one click and choose which contact details to share. They can also download their data or delete their account. That control is what makes people comfortable signing up.",
    ),
  });

  // 14. Section: school --------------------------------------------------------------------------------------
  newSection("Parcours de l’école", "School journey");
  s = pres.addSlide({ masterName: "SECTION", sectionTitle: section });
  s.addText("02", {
    x: 0.8,
    y: 0.8,
    w: 3,
    h: 1.5,
    fontFace: THEME.headFontFace,
    fontSize: 96,
    bold: true,
    color: C.accent2,
    margin: 0,
    isTextBox: true,
    objectName: "section number",
  });
  s.addText(X("Le parcours de l’école", "The school’s side"), { placeholder: "title" });
  s.addText(X("Deux rôles pour votre équipe", "Two roles for your team"), { placeholder: "body" });
  const roles = [
    [
      "FiSettings",
      X("Administrateur de l’école", "School admin"),
      X(
        `Tout${NB}: approbations, dossiers, personnel, modèles de courriel et paramètres.`,
        "Everything: approvals, records, staff, email templates and settings.",
      ),
    ],
    [
      "FiUserCheck",
      X("Réviseur", "Reviewer"),
      X(
        "Décide des inscriptions et consulte les dossiers et le journal d’audit.",
        "Decides on sign-ups and reads records and the audit log.",
      ),
    ],
  ];
  for (let i = 0; i < roles.length; i++) {
    const [ico, head, body] = roles[i];
    const x = 0.8 + i * 5.95,
      y = 4.55,
      w = 5.6,
      h = 1.85;
    s.addShape(S.ROUNDED_RECTANGLE, {
      x,
      y,
      w,
      h,
      rectRadius: 0.14,
      fill: { color: C.background1, transparency: 88 },
      line: { color: C.accent4, width: 1, transparency: 50 },
      objectName: `role ${i + 1}`,
    });
    await iconCircle(s, ico, x + 0.3, y + 0.3, 0.6, {
      fill: C.background1,
      color: HEX.accent1,
      id: `role ${i + 1}`,
    });
    s.addText(head, {
      x: x + 1.1,
      y: y + 0.3,
      w: w - 1.4,
      h: 0.6,
      fontSize: 20,
      bold: true,
      color: C.background1,
      margin: 0,
      valign: "middle",
      isTextBox: true,
      objectName: `role head ${i + 1}`,
    });
    s.addText(body, {
      x: x + 0.3,
      y: y + 1.05,
      w: w - 0.6,
      h: 0.7,
      fontSize: 15,
      color: C.accent4,
      margin: 0,
      valign: "top",
      isTextBox: true,
      objectName: `role body ${i + 1}`,
    });
  }
  s.addNotes(
    X(
      "Côté école, deux rôles : l’administrateur, qui a accès à tout, et le réviseur, par exemple une secrétaire ou un enseignant de longue date, qui reconnaît les anciens et décide des inscriptions.",
      "On the school’s side, two roles: the admin, who can do everything, and the reviewer, for example an assistant or a long-time teacher, who recognises alumni and decides on sign-ups.",
    ),
  );

  const E = X("ÉCOLE", "SCHOOL");
  await feature({
    chip: X(`${E} · TABLEAU DE BORD`, `${E} · DASHBOARD`),
    title: X("Tout voir d’un coup d’œil.", "Everything at a glance."),
    sub: X(
      "Ce qui attend une décision, et ce que fait l’équipe.",
      "What needs a decision, and what the team is doing.",
    ),
    callouts: [
      [
        "FiClock",
        X("En attente", "Waiting"),
        X("Les inscriptions, et depuis combien de temps.", "Sign-ups, and for how long."),
      ],
      [
        "FiBarChart2",
        X("Indicateurs", "Key numbers"),
        X("Renseignements requis, approuvés, publiés.", "Info requested, approved, published."),
      ],
      [
        "FiActivity",
        X("Activité récente", "Recent activity"),
        X("Les dernières actions de l’équipe.", "The team’s latest actions."),
      ],
    ],
    device: laptopOnly("s01-dashboard", X("Tableau de bord", "Dashboard")),
    notes: X(
      "Le tableau de bord dit tout de suite ce qui demande votre attention : ici, des inscriptions attendent, la plus ancienne depuis deux jours. On voit aussi combien d’anciens ont publié leur profil et ce que l’équipe a fait récemment.",
      "The dashboard shows straight away what needs your attention: here, sign-ups are waiting, the oldest for two days. You also see how many alumni published their profile and what the team did recently.",
    ),
  });

  await feature({
    chip: X(`${E} · APPROBATIONS`, `${E} · APPROVALS`),
    title: X("Personne n’entre sans votre accord.", "Every member, approved by you."),
    sub: X(
      "Une personne de l’école examine chaque demande.",
      "A person at the school reviews every request.",
    ),
    callouts: [
      [
        "FiLink",
        X("Dossier suggéré", "Suggested record"),
        X("Même sous le nom de jeune fille.", "Even under a maiden name."),
      ],
      [
        "FiCheckSquare",
        X("Trois décisions", "Three decisions"),
        X("Approuver, demander des précisions, refuser.", "Approve, ask for details, decline."),
      ],
      [
        "FiFileText",
        X("Signé", "Signed"),
        X(
          "Chaque décision porte le nom de son auteur.",
          "Every decision carries its author’s name.",
        ),
      ],
    ],
    device: laptopCard(
      "s03-review",
      "s02-approvals",
      X("Examen d’une demande", "Reviewing a request"),
      X("File des approbations", "Approval queue"),
    ),
    notes: X(
      "Voici la file d’attente. Pour Déborah Lévy, la plateforme suggère un dossier existant : Déborah Abitbol, promotion 2009, son nom de jeune fille. Le réviseur approuve et lie au dossier, demande des renseignements, ou refuse. Les suggestions ne fusionnent jamais rien automatiquement.",
      "This is the queue. For Déborah Lévy, the platform suggests an existing record: Déborah Abitbol, class of 2009, her maiden name. The reviewer approves and links the record, asks for more information, or declines. Suggestions never merge anything automatically.",
    ),
  });

  await feature({
    chip: X(`${E} · DIPLÔMÉS`, `${E} · ALUMNI`),
    title: X("Tous vos anciens, au même endroit.", "All your alumni, in one place."),
    sub: X(
      `Le registre complet${NB}: publiés, masqués, suspendus.`,
      "The full roster: published, hidden, suspended.",
    ),
    callouts: [
      [
        "FiSearch",
        X("Recherche", "Search"),
        X("Par nom, statut et promotion.", "By name, status and class year."),
      ],
      [
        "FiLock",
        X("Réservé au personnel", "Staff only"),
        X("Notes et nom à l’école restent privés.", "Notes and name at school stay private."),
      ],
      [
        "FiClock",
        X("Historique", "History"),
        X("Tout ce qui s’est passé sur le dossier.", "Everything that happened to the record."),
      ],
    ],
    device: laptopCard(
      "s05-record",
      "s04-roster",
      X("Fiche d’un diplômé", "An alum’s record"),
      X("Registre des diplômés", "Alumni roster"),
    ),
    notes: X(
      "Le registre regroupe tous les dossiers. Chaque fiche sépare ce que voient les membres de ce qui reste réservé au personnel, et l’onglet Historique montre tout ce qui s’est passé. L’administrateur peut suspendre, archiver ou indiquer un décès.",
      "The roster holds every record. Each record separates what members see from what stays with staff, and the History tab shows everything that happened. Admins can suspend, archive or mark someone as deceased.",
    ),
  });

  // Roles table + staff page.
  s = await feature({
    chip: X(`${E} · PERSONNEL`, `${E} · STAFF`),
    title: X("Votre équipe, deux rôles.", "Your team, two roles."),
    device: laptopOnly("s06-staff", X("Page Personnel", "Staff page")),
    notes: X(
      "L’administrateur invite son équipe et choisit le rôle de chacun. La personne reçoit un lien unique valable 7 jours. Le réviseur ne voit que ce dont il a besoin. Aujourd’hui, le lien d’invitation se copie et s’envoie soi-même ; l’envoi automatique arrive bientôt.",
      "The admin invites the team and picks each person’s role. The invitee gets a single-use link valid for 7 days. Reviewers see only what they need. Today the invitation link is copied and sent by hand; automatic sending is coming soon.",
    ),
  });
  const yes = { text: "✓", options: { color: C.accent6, bold: true, align: "center" } };
  const no = { text: "—", options: { color: C.text2, align: "center" } };
  const head = (t, al = "left") => ({
    text: t,
    options: { bold: true, color: C.background1, fill: { color: C.accent1 }, align: al },
  });
  const rows = [
    [
      head(X("Ce que chacun peut faire", "What each role can do")),
      head(X("Administrateur", "School admin"), "center"),
      head(X("Réviseur", "Reviewer"), "center"),
    ],
    [X("Approuver les inscriptions", "Approve sign-ups"), yes, yes],
    [X("Lire les dossiers et le journal", "Read records and the audit log"), yes, yes],
    [X("Modifier ou suspendre un dossier", "Edit or suspend a record"), yes, no],
    [X("Gérer le personnel", "Manage staff"), yes, no],
    [X("Courriels et paramètres", "Emails and settings"), yes, no],
  ].map((r, i) =>
    r.map((c) => {
      const fill = { fill: { color: i % 2 ? C.background2 : C.background1 } };
      if (typeof c === "string") return { text: c, options: fill };
      return { text: c.text, options: { ...c.options, ...(i > 0 ? fill : {}) } };
    }),
  );
  s.addTable(rows, {
    x: 0.7,
    y: 3.4,
    w: 5.4,
    colW: [2.75, 1.6, 1.05],
    rowH: 0.46,
    fontSize: 14,
    color: C.text1,
    valign: "middle",
    margin: [4, 8, 4, 8],
    border: { type: "solid", pt: 0.75, color: HEX.accent4 },
    objectName: "roles table",
  });

  await feature({
    chip: X(`${E} · PARAMÈTRES`, `${E} · SETTINGS`),
    title: X("À l’image de Maïmonide.", "Your brand, everywhere."),
    sub: X(
      `Logo, couleurs, langue et courriels${NB}: l’école garde la main.`,
      "Logo, colours, language and emails: the school stays in charge.",
    ),
    callouts: [
      [
        "FiDroplet",
        X("Vos couleurs", "Your colours"),
        X(
          "Ajustées automatiquement pour rester lisibles.",
          "Adjusted automatically to stay readable.",
        ),
      ],
      [
        "FiGlobe",
        X("Français par défaut", "French by default"),
        X("Chacun peut passer à l’anglais.", "Anyone can switch to English."),
      ],
      [
        "FiMail",
        X("Modèles de courriel", "Email templates"),
        X(
          "En français et en anglais, approuvés par l’école.",
          "In French and English, approved by the school.",
        ),
      ],
    ],
    device: laptopCard(
      "s07-settings",
      "s08-templates",
      X("Paramètres de l’école", "School settings"),
      X("Modèles de courriel", "Email templates"),
    ),
    notes: X(
      "Dans les paramètres : votre logo et vos deux couleurs. Le bleu ciel est très clair, alors la plateforme l’assombrit automatiquement là où il sert de fond à du texte ; c’est l’avertissement de contraste qu’on voit. Les modèles de courriel, en français et en anglais, sont modifiables par l’école, et aucun courriel ne part sans un modèle approuvé. L’envoi automatique est en cours de branchement.",
      "In the settings: your logo and your two colours. The sky blue is very light, so the platform darkens it automatically wherever text sits on it; that is the contrast warning you see. Email templates, in French and English, are edited by the school, and no email goes out without an approved template. Automatic sending is being connected.",
    ),
  });

  await feature({
    chip: X(`${E} · JOURNAL D’AUDIT`, `${E} · AUDIT LOG`),
    title: X("Une trace de chaque décision.", "A record of every decision."),
    sub: X("Qui a fait quoi, et quand.", "Who did what, and when."),
    callouts: [
      [
        "FiFilter",
        X("Filtres", "Filters"),
        X("Approbations, dossiers, personnel, paramètres.", "Approvals, records, staff, settings."),
      ],
      [
        "FiLock",
        X("Inaltérable", "Tamper-proof"),
        X(
          "Aucune entrée ne peut être modifiée ou supprimée.",
          "No entry can be edited or deleted.",
        ),
      ],
      [
        "FiLifeBuoy",
        X("Soutien visible", "Support is visible"),
        X("Nos accès de soutien y sont surlignés.", "Our support access is highlighted there."),
      ],
    ],
    device: laptopOnly("s09-audit", X("Journal d’audit", "Audit log")),
    notes: X(
      "Le journal d’audit garde une trace de chaque décision du personnel. Personne, pas même nous, ne peut modifier ou effacer une entrée. Si notre équipe accède à vos données pour vous aider, cela apparaît ici, surligné.",
      "The audit log records every staff decision. Nobody, not even us, can edit or delete an entry. If our team accesses your data to help you, it shows up here, highlighted.",
    ),
  });

  // 21. Status -----------------------------------------------------------------------------------------------
  newSection("Suite", "Next");
  s = pres.addSlide({ masterName: "WIDE", sectionTitle: section });
  eyebrow(s, X("OÙ NOUS EN SOMMES", "WHERE WE ARE"), 0.7, 0.72);
  s.addText(X("Déjà prêt, et ce qui arrive.", "Ready today, and what’s next."), {
    placeholder: "title",
  });
  const cols = [
    [
      X("Disponible aujourd’hui", "Available today"),
      "FiCheckCircle",
      HEX.accent6,
      X(
        [
          "Inscription, demande d’accès et approbation",
          "Profil en 7 étapes, répertoire et filtres",
          "Contact maîtrisé et consigné",
          "Tableau de bord, registre, personnel, journal",
          "Français, anglais, logo et couleurs de l’école",
        ],
        [
          "Sign-up, access request and approval",
          "7-step profile, directory and filters",
          "Controlled, logged contact",
          "Dashboard, roster, staff, audit log",
          "French, English, school logo and colours",
        ],
      ),
    ],
    [
      X("Prochaines versions", "Coming next"),
      "FiClock",
      HEX.accent5,
      X(
        [
          "Matricule facultatif à l’inscription",
          "Envoi automatique des courriels",
          "Confirmation annuelle des profils",
          "Exportation des données pour l’école",
          "Double authentification du personnel",
        ],
        [
          "Optional student ID at sign-up",
          "Automatic emails",
          "Yearly profile confirmation",
          "Data export for the school",
          "Two-factor sign-in for staff",
        ],
      ),
    ],
  ];
  for (let i = 0; i < cols.length; i++) {
    const [title, ico, color, items] = cols[i];
    const x = 0.7 + i * 6.05,
      y = 2.35,
      w = 5.85,
      h = 3.55;
    s.addShape(S.ROUNDED_RECTANGLE, {
      x,
      y,
      w,
      h,
      rectRadius: 0.16,
      fill: { color: C.background2 },
      line: { color: C.background2, width: 0.5 },
      objectName: `status ${i + 1}`,
    });
    s.addText(title, {
      x: x + 0.35,
      y: y + 0.25,
      w: w - 0.7,
      h: 0.5,
      fontFace: THEME.headFontFace,
      fontSize: 20,
      bold: true,
      color: C.text1,
      margin: 0,
      valign: "middle",
      isTextBox: true,
      objectName: `status head ${i + 1}`,
    });
    const data = await ic(ico, color);
    for (let j = 0; j < items.length; j++) {
      const iy = y + 0.95 + j * 0.5;
      s.addImage({
        data,
        x: x + 0.35,
        y: iy + 0.02,
        w: 0.28,
        h: 0.28,
        objectName: `status icon ${i + 1}.${j + 1}`,
        altText: "",
      });
      s.addText(items[j], {
        x: x + 0.82,
        y: iy,
        w: w - 1.15,
        h: 0.34,
        fontSize: 15,
        color: C.text1,
        margin: 0,
        valign: "middle",
        isTextBox: true,
        objectName: `status item ${i + 1}.${j + 1}`,
      });
    }
  }
  s.addText(
    X(
      "Une première école montréalaise lance son projet pilote en décembre 2026.",
      "A first Montreal school starts its pilot in December 2026.",
    ),
    {
      shape: S.ROUNDED_RECTANGLE,
      x: 0.7,
      y: 6.1,
      w: 11.9,
      h: 0.55,
      rectRadius: 0.12,
      fill: { color: C.accent4 },
      line: { color: C.accent4, width: 0.5 },
      fontSize: 16,
      bold: true,
      color: C.accent1,
      align: "center",
      valign: "middle",
      margin: 0,
      objectName: "pilot",
    },
  );
  s.addNotes(
    X(
      "Soyons transparents. Tout ce qui est à gauche fonctionne aujourd’hui. À droite, ce qui arrive : le matricule facultatif à l’inscription dans la prochaine version, puis l’envoi automatique des courriels, la confirmation annuelle des profils, l’exportation et la double authentification du personnel. Une première école montréalaise commence son projet pilote en décembre.",
      "Let’s be transparent. Everything on the left works today. On the right, what’s coming: the optional student ID at sign-up in the next version, then automatic emails, yearly profile confirmation, data export and two-factor sign-in for staff. A first Montreal school starts its pilot in December.",
    ),
  );

  // 22. Next steps -------------------------------------------------------------------------------------------
  s = pres.addSlide({ masterName: "WIDE", sectionTitle: section });
  eyebrow(s, X("LA SUITE", "NEXT STEPS"), 0.7, 0.72);
  s.addText(X("Et maintenant?", "What’s next?"), { placeholder: "title" });
  s.addText(
    X(
      "Quelques prochaines étapes possibles, à définir ensemble.",
      "A few possible next steps, to decide together.",
    ),
    {
      x: 0.7,
      y: 1.9,
      w: 11.9,
      h: 0.45,
      fontSize: 18,
      color: C.text2,
      margin: 0,
      isTextBox: true,
      objectName: "lead",
    },
  );
  const next = X(
    [
      ["Démo en direct", "Parcourons la plateforme ensemble, côté ancien et côté école."],
      ["Vos retours", "Ce qui vous plaît, ce qui manque, ce qui doit changer pour Maïmonide."],
      [
        "Votre équipe",
        "Choisir un administrateur et un ou deux réviseurs qui connaissent bien les anciens.",
      ],
      ["Un lancement ciblé", "Commencer par quelques promotions, puis élargir à tous les anciens."],
    ],
    [
      ["Live demo", "Walk through the platform together, alumni side and school side."],
      ["Your feedback", "What you like, what’s missing, what should change for Maïmonide."],
      ["Your team", "Choose one admin and one or two reviewers who know the alumni well."],
      ["A focused launch", "Start with a few class years, then open it to every graduate."],
    ],
  );
  s.addShape(S.LINE, {
    x: 1.15,
    y: 3.45,
    w: 9.3,
    h: 0,
    line: { color: C.accent4, width: 2 },
    objectName: "steps line",
  });
  for (let i = 0; i < next.length; i++) {
    const [h2, body] = next[i];
    const x = 0.7 + i * 3.1;
    s.addText(String(i + 1), {
      shape: S.OVAL,
      x,
      y: 3.0,
      w: 0.9,
      h: 0.9,
      fill: { color: C.accent1 },
      line: { color: C.accent1, width: 0.5 },
      fontFace: THEME.headFontFace,
      fontSize: 26,
      bold: true,
      color: C.background1,
      align: "center",
      valign: "middle",
      margin: 0,
      objectName: `next ${i + 1}`,
    });
    s.addText(h2, {
      x,
      y: 4.2,
      w: 2.95,
      h: 0.5,
      fontFace: THEME.headFontFace,
      fontSize: 19,
      bold: true,
      color: C.text1,
      margin: 0,
      valign: "middle",
      isTextBox: true,
      objectName: `next head ${i + 1}`,
    });
    s.addText(body, {
      x,
      y: 4.8,
      w: 2.85,
      h: 1.6,
      fontSize: 16,
      color: C.text1,
      margin: 0,
      valign: "top",
      isTextBox: true,
      objectName: `next body ${i + 1}`,
    });
  }
  s.addNotes(
    X(
      "Pour la suite, nous proposons de faire la démo en direct tout de suite, puis d’entendre vos retours. Si l’idée vous plaît, il suffirait de désigner un administrateur et un ou deux réviseurs, et de commencer par quelques promotions avant d’élargir.",
      "Next, we suggest doing the live demo right away, then hearing your feedback. If you like the idea, all it takes is naming an admin and one or two reviewers, and starting with a few class years before opening it up.",
    ),
  );

  // 23. Closing ----------------------------------------------------------------------------------------------
  s = pres.addSlide({ masterName: "DARK", sectionTitle: section });
  s.addShape(S.OVAL, {
    x: 9.45,
    y: 1.0,
    w: 3.6,
    h: 3.6,
    fill: { color: C.accent1, transparency: 40 },
    line: { color: C.accent1, width: 0.5, transparency: 40 },
    objectName: "glow",
  });
  s.addImage({
    data: await ic("FiMessageCircle", "FFFFFF"),
    x: 10.5,
    y: 2.05,
    w: 1.5,
    h: 1.5,
    objectName: "message icon",
    altText: "",
  });
  s.addText(X("On construit avec vous.", "We’re building this with you."), {
    placeholder: "title",
  });
  s.addText(
    [
      {
        text: X(
          "La plateforme est encore en développement.",
          "The platform is still in development.",
        ),
        options: { bold: true, color: C.background1, breakLine: true, paraSpaceAfter: 12 },
      },
      {
        text: X(
          `Critiques, suggestions, recommandations${NB}: tout est bienvenu. Nous sommes très flexibles et voulons l’adapter aux besoins de Maïmonide.`,
          "Criticism, suggestions, recommendations: all welcome. We’re very flexible and want to shape it around Maïmonide’s needs.",
        ),
        options: { color: C.accent4 },
      },
    ],
    {
      x: 0.75,
      y: 2.35,
      w: 7.2,
      h: 1.9,
      fontSize: 21,
      margin: 0,
      valign: "top",
      isTextBox: true,
      objectName: "closing text",
    },
  );
  const asks = X(
    ["Ce qui vous plaît", "Ce qui manque", "Ce qui doit changer"],
    ["What you like", "What’s missing", "What should change"],
  );
  for (let i = 0; i < asks.length; i++)
    s.addText(asks[i], {
      shape: S.ROUNDED_RECTANGLE,
      x: 0.75 + i * 2.45,
      y: 4.55,
      w: 2.25,
      h: 0.55,
      rectRadius: 0.27,
      fill: { color: C.accent1 },
      line: { color: C.accent1, width: 0.5 },
      fontSize: 15,
      bold: true,
      color: C.background1,
      align: "center",
      valign: "middle",
      margin: 0,
      objectName: `ask ${i + 1}`,
    });
  s.addText(X("Merci! Place à la démo en direct.", "Thank you! Now, the live demo."), {
    x: 0.75,
    y: 5.85,
    w: 9,
    h: 0.6,
    fontFace: THEME.headFontFace,
    fontSize: 28,
    bold: true,
    color: C.accent2,
    margin: 0,
    valign: "middle",
    isTextBox: true,
    objectName: "demo line",
  });
  s.addNotes(
    X(
      "Pour conclure : la plateforme est encore en développement, et c’est le bon moment pour nous dire ce que vous en pensez. Critiques, suggestions, recommandations : tout nous aide. Place à la démo en direct : le parcours d’un ancien, puis celui d’un administrateur et d’un réviseur.",
      "To wrap up: the platform is still in development, and now is the right time to tell us what you think. Criticism, suggestions, recommendations: it all helps. Now the live demo: a graduate’s journey, then an admin’s and a reviewer’s.",
    ),
  );

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
