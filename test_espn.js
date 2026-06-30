const url = 'http://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20221218'
fetch(url).then(r => r.json()).then(data => {
  const match = data.events[0]
  const comp = match.competitions[0]
  console.log(JSON.stringify(comp.competitors, null, 2))
}).catch(console.error)
