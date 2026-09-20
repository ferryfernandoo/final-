async function testSearch() {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/v1/search?q=indonesia&limit=5', {
      headers: { 'Authorization': 'Bearer dn_live_d69468b9c25451f3b7cd8482e96cbcf7' }
    });
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Total results:', data.total_results);
    console.log('Engine speed:', data.duration_ms + 'ms');
    console.log('\nTop 5 Results with Timestamps:');
    (data.results || []).slice(0, 5).forEach((r, idx) => {
      console.log(`[${idx + 1}] ${r.title}`);
      console.log(`    Date: ${r.formatted_date || r.date || 'N/A'} (ISO: ${r.published_at || 'N/A'})`);
      console.log(`    Domain: ${r.domain} | PR: ${r.pagerank}`);
    });
  } catch (err) {
    console.error('Error fetching search results:', err.message);
  }
}

testSearch();
