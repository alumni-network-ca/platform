// Makes a verified account a system admin (FND-13). This is the only way to create the first one: run it once
// per environment with that environment's secret key. The person must have signed up and verified their email.
// Running it again for the same email changes nothing.
//
//   Local:              node scripts/admin/bootstrap-platform-admin.ts --email you@example.com
//   Staging/production: SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=<secret key> \
//                         node scripts/admin/bootstrap-platform-admin.ts --email you@example.com
//
// The change is written to the audit log as 'platform.admin_added'.
import { parseArgs } from "node:util";
import { adminClient, localStack, type Target } from "../lib/supabase-admin.ts";

const { values } = parseArgs({ options: { email: { type: "string" } } });
const email = values.email?.trim();
if (!email) {
  console.error(
    "Usage: node scripts/admin/bootstrap-platform-admin.ts --email <verified account email>",
  );
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (Boolean(url) !== Boolean(secretKey)) {
  console.error(
    "Set both SUPABASE_URL and SUPABASE_SECRET_KEY, or neither to use the local stack.",
  );
  process.exit(1);
}
const target: Target = url && secretKey ? { url, secretKey } : localStack();

const { data: userId, error } = await adminClient(target).rpc("platform_add_admin", {
  p_email: email,
});
if (error) {
  console.error(`Not added: ${error.message}`);
  process.exit(1);
}
console.log(`${email} (${userId}) is a system admin on ${new URL(target.url).host}.`);
