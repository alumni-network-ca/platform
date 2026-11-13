// Variables the browser may see. Each one is read as a literal process.env.NEXT_PUBLIC_* reference: Next inlines only
// those into the browser bundle at build time, so never read them through a variable name.
import { required } from "./read";

export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
};
