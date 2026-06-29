const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const missing = ['South Africa', 'Turkey', 'New Zealand', 'Algeria', 'Jordan', 'Panama'];
  const results = [];
  
  for (const team of missing) {
    const url = `https://duckduckgo.com/html/?q=site:livescore.com/en/football/team/+"${team}"`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    const hrefs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('livescore.com/en/football/team/'));
    });
    
    // Find the first valid href that looks like team/.../ID/
    const match = hrefs.find(h => /\/team\/[^\/]+\/(\d+)/.test(h));
    if (match) {
      const id = match.match(/\/team\/[^\/]+\/(\d+)/)[1];
      results.push({ name: team, id, src: `https://lsm-static-prod.livescore.com/medium/enet/${id}.png` });
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
  require('fs').writeFileSync('missing_livescore.json', JSON.stringify(results, null, 2));
  
  await browser.close();
})();
