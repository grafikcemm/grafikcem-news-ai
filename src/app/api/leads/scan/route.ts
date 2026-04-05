import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SECTOR_QUERIES: Record<string, string[]> = {
  guzellik: ["güzellik salonu", "kuaför", "nail art", "kalıcı makyaj", "cilt bakımı"],
  moda: ["giyim mağazası", "butik", "moda mağazası"],
  emlak: ["emlak ofisi", "gayrimenkul danışmanlığı"],
  spor: ["spor salonu", "fitness center", "pilates studio", "yoga stüdyo"],
  egitim: ["özel ders merkezi", "eğitim merkezi", "dil kursu"],
};

export async function POST(req: Request) {
  try {
    const { sectors = [], city = "", limit = 30 } = await req.json();

    if (!sectors.length) {
      return NextResponse.json({ error: "Sektör zorunludur" }, { status: 400 });
    }

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: "Google Maps API Key eksik" }, { status: 500 });
    }

    const queries: { query: string; sector: string }[] = [];
    for (const sector of sectors) {
      const keywords = SECTOR_QUERIES[sector] || [];
      for (const keyword of keywords) {
        queries.push({
           query: city ? `${keyword} ${city}` : keyword,
           sector,
        });
      }
    }

    let addedCount = 0;
    const addedLeads = [];

    for (const q of queries) {
      if (addedCount >= limit) break;

      console.log(`Bölge taranıyor: ${q.query}`);

      const placesRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q.query)}&key=${GOOGLE_MAPS_API_KEY}&language=tr&region=tr`
      );

      const placesData = await placesRes.json();
      console.log('Places API yanıtı (count):', placesData.results?.length || 0);
      
      const placesList = placesData.results || [];
      if (placesList.length === 0) continue;

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

        if (existing) {
          console.log('Zaten var, atlanıyor:', place.name);
          continue;
        }

        // Fetch Details for website and phone
        const detailsRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address&key=${GOOGLE_MAPS_API_KEY}&language=tr`
        );
        const detailsData = await detailsRes.json();
        const d = detailsData.result || {};

        const has_website = !!d.website;
        const potential_score = has_website ? 40 : 75;

        // Parsing city from formatted_address if missing
        let cityStr = city || "Bilinmeyen Şehir";
        if (!city && place.formatted_address) {
            const parts = place.formatted_address.split('/');
            if (parts.length > 1) {
                cityStr = parts[parts.length - 1].trim().split(" ")[0].replace(',', '');
            }
        }

        const newLead = {
          business_name: place.name || "Bilinmiyor",
          sector: q.sector,
          city: cityStr,
          website_url: d.website || null,
          contact_phone: d.formatted_phone_number || null,
          google_maps_place_id: placeId,
          has_website,
          potential_score,
          status: "discovered",
          updated_at: new Date().toISOString()
        };

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("leads")
          .insert(newLead)
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError.message);
          continue;
        }
        
        if (inserted) {
          addedCount++;
          addedLeads.push(inserted);
          console.log('Yeni lead eklendi:', newLead.business_name);
        }
      }
    }

    return NextResponse.json({ added: addedCount, leads: addedLeads });
  } catch (error: any) {
    console.error("Scan Error Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
