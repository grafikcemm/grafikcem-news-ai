require('dotenv').config({ path: '.env.local' });

async function testLeadScan() {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  const searchQuery = "Kuaför İstanbul";

  console.log(`Testing with Query: ${searchQuery}`);
  console.log(`API Key: ${GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.slice(0, 10) + '...' : 'MISSING'}`);

  try {
    const placesRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri',
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          languageCode: 'tr',
          regionCode: 'TR',
          maxResultCount: 5,
        }),
      }
    );

    const placesData = await placesRes.json();
    console.log('--- RAW RESPONSE FROM GOOGLE ---');
    console.log(JSON.stringify(placesData, null, 2));
    console.log('--- END RAW RESPONSE ---');

    const placesList = placesData.places || [];
    console.log(`Found ${placesList.length} places.`);
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

testLeadScan();
