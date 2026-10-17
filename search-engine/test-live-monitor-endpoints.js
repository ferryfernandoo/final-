async function testEndpoints() {
  console.log('--- TESTING /api/geo/stats & /api/geo/recent ---');
  const geoStats = await (await fetch('http://localhost:3000/api/geo/stats')).json();
  console.log('Geo Stats:', geoStats);
  const geoRecent = await (await fetch('http://localhost:3000/api/geo/recent?limit=5')).json();
  console.log('Geo Recent Count:', geoRecent.total);
  if (geoRecent.results[0]) {
    console.log('Latest Geo Place:', geoRecent.results[0].name, '-', geoRecent.results[0].category, `[${geoRecent.results[0].lat}, ${geoRecent.results[0].lng}]`);
  }

  console.log('\n--- TESTING /api/images/stats & /api/images/recent ---');
  const imgStats = await (await fetch('http://localhost:3000/api/images/stats')).json();
  console.log('Image Stats:', imgStats);
  const imgRecent = await (await fetch('http://localhost:3000/api/images/recent?limit=5')).json();
  console.log('Image Recent Count:', imgRecent.total);
  if (imgRecent.results[0]) {
    console.log('Latest Image:', imgRecent.results[0].title, `[${imgRecent.results[0].width}x${imgRecent.results[0].height}]`, imgRecent.results[0].domain);
  }
}

testEndpoints().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
