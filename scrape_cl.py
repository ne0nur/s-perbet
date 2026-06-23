import requests
from bs4 import BeautifulSoup
import json
import re

url = "https://fbref.com/en/comps/8/schedule/Champions-League-Scores-and-Fixtures"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
try:
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        exit(1)
        
    soup = BeautifulSoup(response.text, "html.parser")
    # Finding the correct table for 2025-2026 (or just the main sched table)
    table = soup.find("table", {"id": lambda x: x and x.startswith("sched_")})
    
    if not table:
        print("No table found")
        exit(1)
        
    rows = table.find("tbody").find_all("tr")
    matches = []
    
    for row in rows:
        if "spacer" in row.get("class", []) or "thead" in row.get("class", []):
            continue
            
        home = row.find("td", {"data-stat": "home_team"})
        away = row.find("td", {"data-stat": "away_team"})
        score = row.find("td", {"data-stat": "score"})
        date = row.find("td", {"data-stat": "date"})
        time = row.find("td", {"data-stat": "time"})
        round_name = row.find("th", {"data-stat": "round"}) or row.find("td", {"data-stat": "round"})
        
        if home and away and home.text.strip() and away.text.strip():
            sc = score.text.strip() if score else ""
            tore_heim = None
            tore_gast = None
            
            if sc:
                # Remove brackets for penalties e.g. "(4) 1-1 (3)"
                sc = re.sub(r'\(.*?\)', '', sc).strip()
                parts = sc.split("–")
                if len(parts) == 2:
                    tore_heim = int(parts[0].strip())
                    tore_gast = int(parts[1].strip())
            
            matches.append({
                "round": round_name.text.strip() if round_name else "Group Stage",
                "date": date.text.strip() if date else "",
                "time": time.text.strip() if time else "21:00",
                "home": home.text.strip(),
                "away": away.text.strip(),
                "tore_heim": tore_heim,
                "tore_gast": tore_gast
            })
            
    print(f"Found {len(matches)} matches")
    with open("/tmp/cl_matches.json", "w") as f:
        json.dump(matches, f, indent=2)
except Exception as e:
    print(f"Exception: {e}")
