import fetch from 'node-fetch';

async function main() {
  const res = await fetch('http://localhost:3000/api/tweet/drafts');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main();
