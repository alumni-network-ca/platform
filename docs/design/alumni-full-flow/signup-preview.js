/* Local preview adapter for the exported Claude design screens; no application auth. */
const frame = document.querySelector("iframe");
const stage = document.querySelector("#stage");
const screens = {
  Welcome: ["Public entry · top-right Join now", "Join", "The guest navigation offers separate Join now and Sign in actions."],
  SignIn: ["Existing account · email and password", "Join", "This example signs in as an applicant awaiting school approval."],
  Join: ["Create a new account", "VerifyEmail", "Account creation and alumni admission are separate."],
  VerifyEmail: ["Confirm account email", "ConfirmEmailMessage", "Preview the confirmation email next. The app sends a link, never a sign-in code."],
  ConfirmEmailMessage: ["Account confirmation email", "Request", "The confirmation link continues to the alumni request."],
  Request: ["Submit alumni access request", "Pending", "Only a school reviewer can grant alumni membership."],
  Pending: ["Account created · approval pending", "SignupReview", "The next screen switches to the school reviewer's view for this demonstration."],
  RequestEdit: ["Edit a pending request", "Pending", "Applicants can correct details while waiting for the school."],
  SignupReview: ["Staff-only · review alumni admission", "AccessApproved", "School staff decide; the applicant cannot approve their own request."],
  NeedsInfo: ["Applicant · reply to the school", "Pending", "Replying returns the request to school review."],
  RequestDeclined: ["Applicant · request not approved", "Welcome", "A sign-in account does not grant directory access."],
  Approved: ["Approval notification email", "SignIn?approved=1", "After sign-in, this approved applicant can begin profile setup."],
  AccessApproved: ["School approved · profile setup unlocked", "OnbAbout", "The existing onboarding designs continue after approval."],
  OnbAbout: ["Existing design · profile setup", "OnbCareer", "This is the existing Claude onboarding screen, outside this design revision."],
  OnbCareer: ["Existing design · career", "OnbNetwork", "Existing onboarding design."],
  OnbNetwork: ["Existing design · network", "OnbPublish", "Existing onboarding design."],
  OnbPublish: ["Existing design · visibility", "AccessApproved", "Existing onboarding design."],
  AdmQueue: ["Existing design · school approval queue", "SignupReview", "The new reviewer snapshot focuses on this applicant's admission."]
};
let mobile = window.matchMedia("(max-width: 760px)").matches;
let revision = 0;
let contentHeight = 980;
function resize() {
  const width = mobile ? 390 : 1280;
  const height = contentHeight;
  const scale = Math.min(1, stage.clientWidth / width);
  frame.style.width = width + "px"; frame.style.height = height + "px";
  frame.style.transform = "scale(" + scale + ")";
  stage.style.height = height * scale + "px";
}
function nav(role) {
  const guest = role === "guest";
  const reviewer = role === "reviewer";
  return '<style>.nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 32px;background:#0b2159;color:#fff;min-height:70px;flex-wrap:wrap}.brand{display:flex;gap:11px;align-items:center;text-decoration:none;color:#fff}.brand img{width:42px;height:42px;padding:4px;background:#fff;border-radius:10px;object-fit:contain}.brand strong{font-size:14px;display:block}.brand small{font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:#b8c0d8;display:block}.nav-actions{display:flex;gap:10px;align-items:center}.nav-actions a{color:white;text-decoration:none;font-size:13px}.nav-actions .nav-signin{border:1px solid #6b7a9e;border-radius:7px;padding:8px 15px;font-weight:700}.nav-actions .nav-join{border-radius:7px;padding:9px 16px;background:#7b1e3d;font-weight:700}.avatar{width:34px;height:34px;background:#eab6ce;border-radius:50%;display:grid;place-items:center;color:#0b2159;font-size:12px;font-weight:800}.role{border:1px solid #8fa6d6;border-radius:999px;padding:5px 10px;color:#d6e2ff;font-size:12px;font-weight:700}</style><header class="nav" style="font-family:Inter,Arial,sans-serif"><a class="brand" href="Welcome.dc.html"><img src="/herzliah-logo.png" alt=""><span><strong>Herzliah Alumni Network</strong><small>Private · verified · connected</small></span></a><nav class="nav-actions" aria-label="Main">' +
    (guest ? '<a href="#" data-preview-feedback="Language switching is outside this English design preview.">FR</a><a class="nav-signin" href="SignIn.dc.html">Sign in</a><a class="nav-join" href="Join.dc.html">Join now</a>' :
    (reviewer ? '<span class="role">Reviewer</span>' : '') + '<span class="avatar" aria-label="' + (reviewer ? 'Avi Sasson' : 'Dana Levy') + '">' + (reviewer ? 'AS' : 'DL') + '</span><a href="SignIn.dc.html">Sign out</a>') +
    '</nav></header>';
}
async function show() {
  const ownRevision = ++revision;
  const route = (location.hash.slice(1) || "Join");
  const [id, query = ""] = route.split("?");
  if (!Object.hasOwn(screens,id)) { location.hash = "Join"; return; }
  const params = new URLSearchParams(query);
  contentHeight = mobile ? 1600 : 980;
  window.scrollTo(0, 0);
  const [title, next, note] = screens[id];
  document.querySelector("#screen-title").textContent = title;
  document.querySelector("#screen-note").textContent = note;
  document.querySelector("#next-screen").href = "#" + next;
  document.querySelectorAll(".screens a").forEach(a => {
    if (a.hash === "#" + id) a.setAttribute("aria-current","page");
    else a.removeAttribute("aria-current");
  });
  try {
    const response = await fetch("./" + id + ".dc.html");
    if (!response.ok) throw new Error("Design screen unavailable: " + id);
    let html = await response.text();
    if (ownRevision !== revision) return;
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<dc-import\b[^>]*role="([^"]+)"[^>]*><\/dc-import>/g, (_,role) => nav(role));
    html = html.replaceAll("/_blob/4656ce653b200e07991d58266759ac80", "/herzliah-logo.png");
    if (id === "SignIn" && params.get("approved") === "1") {
      html = html.replace('href="Pending.dc.html" data-signin-destination', 'href="AccessApproved.dc.html" data-signin-destination');
    }
    const adapter = '<script>document.addEventListener("click", function(event) { const feedback = event.target.closest("[data-preview-feedback]"); if(feedback) {event.preventDefault(); let status=document.querySelector("#preview-feedback");if(!status){status=document.createElement("p");status.id="preview-feedback";status.setAttribute("role","status");status.style.cssText="font-size:13px;color:#4a5575";feedback.parentElement.append(status);}status.textContent=feedback.dataset.previewFeedback;return;} const link=event.target.closest("a"); if(!link)return; const href=link.getAttribute("href")||""; const match=href.match(/^([A-Za-z]+)\\.dc\\.html(\\?[^#]*)?$/);event.preventDefault();if(match)parent.postMessage({type:"alumni-preview-route",route:match[1]+(match[2]||"")},"*");});document.addEventListener("submit",event=>event.preventDefault());new ResizeObserver(()=>parent.postMessage({type:"alumni-preview-height",height:Math.ceil(document.body.getBoundingClientRect().height)},"*")).observe(document.body);<\/script>';
    frame.srcdoc = html.replace("</head>", '<base href="' + location.origin + '/"></head>').replace("</body>",adapter+"</body>");
    document.querySelector("#error").style.display = "none";
    resize();
  } catch (error) {
    const alert = document.querySelector("#error"); alert.textContent = error.message; alert.style.display = "block";
  }
}
document.querySelector("#desktop").addEventListener("click", () => {mobile=false; document.querySelector("#desktop").setAttribute("aria-pressed","true");document.querySelector("#mobile").setAttribute("aria-pressed","false");resize();});
document.querySelector("#mobile").addEventListener("click", () => {mobile=true; document.querySelector("#mobile").setAttribute("aria-pressed","true");document.querySelector("#desktop").setAttribute("aria-pressed","false");resize();});
window.addEventListener("message", event => {
  if (event.source !== frame.contentWindow) return;
  if(event.data?.type === "alumni-preview-height") { const height = Number(event.data.height); if(height >= 500 && height <= 5000) {contentHeight = height;resize();} return; }
  if(event.data?.type !== "alumni-preview-route") return;
  const route = String(event.data.route || "");
  if (Object.hasOwn(screens,route.split("?")[0])) location.hash = route;
});
document.querySelector("#desktop").setAttribute("aria-pressed", String(!mobile));
document.querySelector("#mobile").setAttribute("aria-pressed", String(mobile));
window.addEventListener("hashchange", show);
new ResizeObserver(resize).observe(stage);
show();
