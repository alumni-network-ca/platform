// Local test accounts created by supabase/seed.sql (local and staging only, never production).
export const LOCAL_PASSWORD = "LocalDev-Passw0rd";

export const accounts = {
  admin: "admin@herzliah.test",
  reviewer: "reviewer@herzliah.test",
  alumni: "alumni@herzliah.test",
  newMember: "newmember@herzliah.test",
  pending: "pending@herzliah.test",
  needsInfo: "needsinfo@herzliah.test",
  rejected: "rejected@herzliah.test",
  withdrawn: "withdrawn@herzliah.test",
  suspended: "suspended@herzliah.test",
  outsider: "outsider@alumninetwork.test",
  system: "system@alumninetwork.test",
  testSchoolAdmin: "admin@test-school.test",
  testSchoolAlumni: "alumni@test-school.test",
  testSchoolPending: "pending@test-school.test",
} as const;
