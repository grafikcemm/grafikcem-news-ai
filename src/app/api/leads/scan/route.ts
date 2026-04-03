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

      const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri',
        },
        body: JSON.stringify({
          textQuery: q.query,
          languageCode: 'tr',
          regionCode: 'TR',
          maxResultCount: 20,
        }),
      });

      const placesData = await placesRes.json();
      
      // Step 1: Log API response
      console.log('--- Places API Search Log ---');
      console.log('Query:', q.query);
      console.log('Results count:', placesData.places?.length || 0);
      if (placesData.error) {
        console.log('Status / Error Message:', placesData.error.status, placesData.error.message);
      }
      
      const placesList = placesData.places || [];
      if (placesList.length === 0) continue;

      for (const place of placesList) {
        if (addedCount >= limit) break;

        const placeId = place.id;
        if (!placeId) continue;

        // Step 3: Duplicate Check with maybeSingle
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("leads")
          .select("id")
          .eq("google_maps_place_id", placeId)
          .maybeSingle();

        if (existing) {
          console.log('Duplicate skipped:', place.displayName?.text);
          continue;
        }

        // Fetch details from new API
        const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
          headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'displayName,formattedAddress,nationalPhoneNumber,websiteUri',
          },
        });
        const detailsData = await detailsRes.json();

        if (detailsData.error) {
           console.log("Place Details Error:", detailsData.error.message);
           continue;
        }

        const d = detailsData;
        const has_website = !!d.websiteUri;
        const potential_score = has_website ? 40 : 75;

        // Try to parse district roughly from formattedAddress (e.g. "Atatürk Cd., 34000 Beşiktaş/İstanbul")
        let districtStr = "";
        let cityStr = city || "";
        if (d.formattedAddress) {
           const parts = d.formattedAddress.split('/');
           if (parts.length > 1) {
              const beforeSlash = parts[0].trim().split(" ");
              districtStr = beforeSlash[beforeSlash.length - 1]; // last word before slash is usually district in TR address format
              if (!cityStr) {
                 const afterSlash = parts[1].trim().split(" ")[0]; // word after slash is usually city
                 cityStr = afterSlash.replace(',', '');
              }
           }
        }

        const newLead = {
          business_name: d.displayName?.text || place.displayName?.text || "Bilinmiyor",
          sector: q.sector,
          city: cityStr,
          district: districtStr || null,
          website_url: d.websiteUri || null,
          contact_phone: d.nationalPhoneNumber || null,
          google_maps_place_id: placeId,
          has_website,
          potential_score,
          status: "discovered",
        };

        // Step 5: Insert Error Log
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("leads")
          .insert(newLead)
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError.message, insertError.details);
          continue;
        }
        
        if (inserted) {
          addedCount++;
          addedLeads.push(inserted);
        }
      }
    }

    return NextResponse.json({ added: addedCount, leads: addedLeads });
  } catch (error: any) {
    console.error("Scan Error Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
