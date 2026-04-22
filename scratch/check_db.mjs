import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data, error } = await supabase.from("tweet_drafts").select("*").limit(1);
  if (error) {
    console.error("Error fetching tweet_drafts:", error);
  } else {
    console.log("Columns in tweet_drafts:", Object.keys(data[0] || {}));
  }
}

checkSchema();
