import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { startOfWeek, addDays, getISOWeek } from "date-fns";

export async function POST(req: Request) {
  try {
    // Fetch top 10 unassigned potential leads
    const { data: leads, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .in("status", ["discovered", "researched"])
      .order("potential_score", { ascending: false })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ planned: 0, assignments: [] });
    }

    // Calculate Monday of the current week
    const today = new Date();
    // startOfWeek starts on Sunday natively, but passing {weekStartsOn: 1} makes it Monday
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const weekNumber = getISOWeek(today);

    const assignments = [];
    let plannedCount = 0;

    // Distribute 2 per day (Monday to Friday, which is 0 to 4 days added to Monday)
    for (let i = 0; i < leads.length; i++) {
       const lead = leads[i];
       const dayOffset = Math.floor(i / 2); // 0, 0, 1, 1, 2, 2, 3, 3, 4, 4
       
       if (dayOffset > 4) break; // In case we fetched >10 somehow, limit to Friday

       const assignedDay = addDays(monday, dayOffset);
       const dateString = assignedDay.toISOString().split("T")[0]; // YYYY-MM-DD format

       const { data: updatedLead, error: updateError } = await supabaseAdmin
         .from("leads")
         .update({
           assigned_day: dateString,
           week_number: weekNumber,
           updated_at: new Date().toISOString()
         })
         .eq("id", lead.id)
         .select()
         .single();

       if (!updateError && updatedLead) {
         assignments.push(updatedLead);
         plannedCount++;
       }
    }

    return NextResponse.json({ planned: plannedCount, assignments });
  } catch (error: any) {
    console.error("Weekly Plan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
