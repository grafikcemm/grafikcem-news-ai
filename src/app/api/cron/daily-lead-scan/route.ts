import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SECTORS = [
  "guzellik",
  "restoran",
  "moda",
  "spor",
  "egitim",
  "emlak",
  "klinik",
  "hukuk"
];

const SECTOR_QUERIES: Record<string, string[]> = {
  guzellik: ["güzellik salonu", "estetik merkezi", "kuaför", "nail art", "cilt bakımı"],
  restoran: ["restoran", "kafe", "pizzacı", "steakhouse", "pastane"],
  moda: ["butik", "moda evi", "giyim mağazası", "ayakkabı mağazası"],
  spor: ["spor salonu", "fitness center", "pilates stüdyosu", "yoga merkezi"],
  egitim: ["özel okul", "dil kursu", "etüt merkezi", "kreş", "anaokulu"],
  emlak: ["emlak ofisi", "gayrimenkul danışmanlığı", "inşaat firması"],
  klinik: ["özel klinik", "diş kliniği", "veteriner kliniği", "diyetisyen"],
  hukuk: ["hukuk bürosu", "avukatlık ofisi", "noter", "mali müşavir"]
};

const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa"];

export async function GET(req: Request) {
  try {
    // Basic Cron Auth (Vercel specific or simple check)
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dayOfMonth = new Date().getDate();
    const sectorIndex = dayOfMonth % SECTORS.length;
    const cityIndex = dayOfMonth % CITIES.length;

    const sector = SECTORS[sectorIndex];
    const city = CITIES[cityIndex];
    const limit = 10;

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API Key eksik");
    }

    const keywords = SECTOR_QUERIES[sector] || [sector];
    let addedCount = 0;
    const addedLeads = [];

    // Combine keywords into a batch of queries
    const queries = keywords.map(kw => `${kw} ${city}`);

    for (const q of queries) {
      if (addedCount >= limit) break;

      console.log(`Otomatik tarama başlatıldı: ${q}`);

      const placesRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${GOOGLE_MAPS_API_KEY}&language=tr&region=tr&fields=formatted_address,name,rating,user_ratings_total,place_id,geometry`
      );
      const placesData = await placesRes.json();
      const placesList = placesData.results || [];

      for (const place of placesList) {
        if (addedCount >= limit) break;

        const placeId = place.place_id;
        if (!placeId) continue;

        // Duplicate Check
        const { data: existing } = await supabaseAdmin
          .from("leads")
          .select("id")
          .eq("google_maps_place_id", placeId)
          .maybeSingle();

        if (existing) continue;

        // Fetch Extended Details
        const detailsRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address,geometry,rating,user_ratings_total,business_status,opening_hours&key=${GOOGLE_MAPS_API_KEY}&language=tr`
        );
        const detailsData = await detailsRes.json();
        const d = detailsData.result || {};

        // CRITICAL: Telefon zorunluluğu
        const phone = d.formatted_phone_number;
        if (!phone) {
          console.log(`Telefon yok, atlanıyor: ${place.name}`);
          continue;
        }

        const has_website = !!d.website;
        // Puanlama mantığı: Telefon var + Website yok = 80, Website var = 50
        const potential_score = has_website ? 50 : 80;

        const newLead = {
          business_name: place.name || "Bilinmiyor",
          sector: sector,
          city: city, // Rotasyondaki şehir
          district: place.formatted_address?.split(',')?.reverse()?.[1]?.trim() || null,
          website_url: d.website || null,
          contact_phone: phone,
          google_maps_place_id: placeId,
          latitude: d.geometry?.location?.lat || null,
          longitude: d.geometry?.location?.lng || null,
          has_website,
          potential_score,
          rating: d.rating || null,
          review_count: d.user_ratings_total || 0,
          status: "discovered",
          updated_at: new Date().toISOString()
        };

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("leads")
          .insert(newLead)
          .select()
          .single();

        if (!insertError && inserted) {
          addedCount++;
          addedLeads.push(inserted.id);
          console.log(`Otomatik eklendi: ${newLead.business_name}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      added: addedCount, 
      sector, 
      city,
      leads: addedLeads 
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
