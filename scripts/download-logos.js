import fs from 'fs';
import https from 'https';

const download = (url, dest) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) {
      console.log('Redirecting to:', res.headers.location);
      return download(res.headers.location, dest);
    }
    console.log('Downloading from:', url, 'Status:', res.statusCode);
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Finished:', dest);
    });
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
};

download('https://upload.wikimedia.org/wikipedia/de/b/b3/UEFA_Champions_League_logo.svg', 'public/logos/champions-league.svg');
download('https://upload.wikimedia.org/wikipedia/commons/e/e0/Trendyol_S%C3%BCper_Lig_logo.svg', 'public/logos/super-lig.svg');
