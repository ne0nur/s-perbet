async function run() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260720"
  try {
    const res = await fetch(url)
    const data = await res.json()
    const events = data.events || []
    events.forEach(ev => {
      const date = ev.date
      const name = ev.name
      const comp = ev.competitions[0]
      const home = comp.competitors.find(c => c.homeAway === 'home')
      const away = comp.competitors.find(c => c.homeAway === 'away')
      console.log(`${date} | ${name} | ${home?.team?.name} vs ${away?.team?.name}`)
    })
  } catch (err) { console.error(err.message) }
}
run()
