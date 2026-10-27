
/* ============================================================================
   RELEASE NOTES (2026-10-22). Newest release first. Name: FantasyBallerzMMDDYY - Version.
   Every change gets the next ID (BUG - 001, BUG - 002, ...), never reused.
   ============================================================================ */
const RELEASES=[
  {v:"2.1",date:"2026-10-27",title:"Table headers fix",notes:[
    ["141","Fix","Column headers (Player, Slot, GP…) no longer slide down over the first rows of a table, like Luka's row on My Team or the top teams in Projected category ranks."]]},
  {v:"2.0",date:"2026-10-26",title:"Go live: the app runs the league",all:true,notes:[
    ["137","New","The app now runs Indian Ballerz. Lineups, adds, drops, waiver claims and trades happen here instead of on ESPN. ESPN only supplies NBA box scores, games, injuries and news."],
    ["138","Change","Every roster and lineup was copied from ESPN on Oct 26: the draft plus all 48 adds and drops since, so each team starts exactly where it was on ESPN."],
    ["139","Change","League rules are on for everyone: waivers (24 hours after a drop, claims Sundays 8 AM ET, rolling order), a 48-hour league vote on trades with commissioner override, legal-roster checks, and 4 playoff teams seeded by record."],
    ["140","Change","Help is rewritten for the app-run league: where to make moves, how waivers and trade votes work, and what Refresh still pulls from ESPN."]]},
  {v:"1.41",date:"2026-10-26",title:"Analytics and Pick'em extras",notes:[
    ["133","New","Analytics › Insights has a row of chips at the top that jump to each card, and every card has a fold button (▾). Folded cards stay folded on this device."],
    ["134","New","Tracker on phones: chips above the category charts (All, FG%, FT%, …) show one category at a time, so you don't scroll through ten small charts."],
    ["135","New","Pick'em: each team in Make your picks shows its rough chance to win, from its healthy players' ESPN projections times their games that week."],
    ["136","Fix","Account › Display settings opens again on phones and in Phone style. The Account menu's slide-down was closing the Display sheet right after it opened, so there was no way to switch the layout back."]]},
  {v:"1.40",date:"2026-10-26",title:"Phone upgrades",notes:[
    ["129","Change","Phones: the header is one row (team, chat, week, your account button). Theme, release notes, help, the stats time, Go to this week and Switch to the opponent are in the account menu; a red dot on it means new release notes. The commissioner still sees Refresh."],
    ["130","Change","Players on phones: the add/drop/trade button sits next to the name and the stat columns are narrower, so three or four categories show without scrolling."],
    ["131","New","League › Scoreboard starts with a card per matchup: each team's category score (like 6-1-1) and its chance to win. Tap a team to open the matchup."],
    ["132","Change","League on phones: all sections show as a grid of icons instead of a row that hid half of them off-screen."]]},
  {v:"1.39",date:"2026-10-26",title:"Audit cleanup",notes:[
    ["120","Change","My Team has one Auto-set row (Auto-set today, Rest of matchup) with Matchup history next to it. The separate Auto-set card that repeated the same buttons is gone; Fix lineup stays in the alert."],
    ["121","Change","The login badge in the header is now an account button with your team's initials. It opens Display settings, Release notes, Help and Log out."],
    ["122","Change","Players: the compare button is a checkbox, so it no longer looks like a second add button. One menu picks Free agents, All players, Rostered or a team (the repeated switch is gone)."],
    ["123","Change","Players on phones: Season/Projected, Per game/Totals and Rank fold into More filters, which shows the current choices."],
    ["124","New","Players has two views: Player list and Market. Market holds Trending, Rising and Falling on ESPN, plus Heating up, Cooling off and Hot free agents (moved from Analytics, which links to them)."],
    ["125","Change","Sub-tabs (Fun, Analytics, My Team and more) stay on one row and scroll sideways on small screens instead of wrapping."],
    ["126","Change","The Advanced matchup switch is a small toggle above the board instead of its own card."],
    ["127","Change","Bigger tap targets on phones: lineup slot buttons, team-name links and the day arrows."],
    ["128","Change","Empty sections share one look: a muted line with a dashed circle that says when the data arrives."]]},
  {v:"1.38",date:"2026-10-26",title:"Audit quick fixes",notes:[
    ["111","Fix","Players: the list no longer cuts off columns. The player name stays pinned while you scroll sideways, a fade at the right edge shows there's more, and on phones the categories come right after the name."],
    ["112","Fix","Analytics › Matchup forecast: the projected record (like 4-3-1) stays on one line."],
    ["113","Change","Phone header: the matchup picker reads \"Wk 1 · Oct 20–25 · now\" and the stats time is shorter, so neither gets cut off."],
    ["114","Fix","League and Fun no longer show an empty band under the tabs on phones."],
    ["115","Fix","My Team phone table: \"start\" (can start from the bench) shows first in the game line, and long names are shortened (A. Nembhard) so they fit."],
    ["116","Fix","Long team names wrap instead of being cut off in the Matchup header, Analytics tables and Fun."],
    ["117","Fix","Duo two-pane: the team card in the right rail no longer has a big empty area."],
    ["118","Change","Empty cards (Matchup awards before a matchup ends, Team records before week 1 ends) move to the bottom of the page until they have something to show."],
    ["119","Change","The data note at the bottom of every page is one short line. The full explanation stays in Help."]]},
  {v:"1.37",date:"2026-10-26",title:"Table header fix",notes:[
    ["110","Fix","Table header rows (like Analytics › Matchup forecast) no longer stick partway down the screen and cover rows when you scroll in the phone or foldable layout. They now stick to the top of the screen."]]},
  {v:"1.36",date:"2026-10-26",title:"Legal rosters",notes:[
    ["106","New","Illegal rosters get a hard lock. A team with more than 13 players off IR, more than 16 in total, or a player on IR who isn't OUT sees a red banner on My Team. Adds, waiver claims, trades and lineup changes are locked until it drops a player or moves the healthy player off IR (one tap from the banner). Stats still count."],
    ["107","New","A ⚠ shows next to an illegal team in Standings and Power rankings. The commissioner can drop players for any team from its banner."],
    ["108","Fix","Adds, waiver claims and trades can no longer take a team past 13 players off IR. Empty IR spots were being used as extra bench spots."],
    ["109","Change","Daily auto-set skips a team while its roster isn't legal. Waiver claims from an illegal team lose with a reason."]]},
  {v:"1.35",date:"2026-10-25",title:"Hersh's feedback",notes:[
    ["097","Fix","Pick'em: if a pick can't be saved (the league is shared with you as view-only), the pick is taken back and a note says why and what to ask for, instead of the page looking frozen."],
    ["098","Fix","Team names no longer get cut off in Analytics › Games left (a style from the Advanced matchup board was squeezing it), Pick'em and Draft results."],
    ["099","Change","The Hershy view is now an Advanced matchup switch on top of the Matchup scoreboard, instead of a choice in Display."],
    ["100","New","Matchup › Tracker has two more charts: win % after each day and starter games played (with the rest of the week projected)."],
    ["101","New","My Team › Season charts (Charts on phones): categories won each matchup, your league rank in every category by matchup, and each category vs the league average."],
    ["102","Change","Pick'em is now the Fun tab: Pick'em, Records, Wrapped, Trivia and Who had more? (Records moved out of League; Trivia and Who had more? moved out of History)."],
    ["103","New","Records › Superlatives: most and fewest moves, biggest category blowout, biggest FG%/FT% gap, closest category win, most points left on the bench, most games started."],
    ["104","New","A 🌮 next to whoever is last in Standings and Power rankings."],
    ["105","Fix","Phones: going from Analytics or League to Matchup could flip the page into the wide desktop layout (table headers in the middle of lists, cut-off names, the chat bar back) until a reload. The phone layout now stays put."]]},
  {v:"1.34",date:"2026-10-25",title:"History fun tools",notes:[
    ["090","New","Analytics › History › Vs team: type a player to see how he does against every team (former teams marked), pick an Opponent for the full story: last time, average vs them compared with everyone else, by season, best and worst game, every game, plus revenge games. Team + Opponent with no player shows the head-to-head record, scores and who plays best in that matchup; just an Opponent shows who scores the most above their usual against them."],
    ["091","New","My Team › Matchup history: every player who plays that day with his history against that day's opponent (games, points vs his usual, last time). Player cards add a line for his next opponent with a link to the full history."],
    ["092","New","History › Duel (every game two players played against each other, who won each stat), Splits (home/away, back-to-backs and rest, wins/losses, close games, blowouts, month, starter/bench, regular season vs playoffs) and Streaks (longest and active runs of 30-point games, double-doubles and more)."],
    ["093","New","History › On this date (the biggest games on any day since 2021, including players on our rosters) and Milestones (round numbers coming up and season paces, for our rostered players or everyone)."],
    ["094","New","History › Fantasy: defense vs position, the best fantasy weeks since 2021 for our 8 categories, draft hindsight (every pick vs where the player ranks) and your roster's history vs this week's opponents."],
    ["095","New","History › Assists + quarters: who sets a player up and who he sets up, how he shoots by quarter including the 4th and overtime, and his hot zones against any team."],
    ["096","New","History › Trivia of the day (one try, same question for the whole league, a leaderboard with streaks, and a button to share your result in league chat) and Who had more? (pick the player with the higher average and build a streak)."]]},
  {v:"1.33",date:"2026-10-25",title:"Stats table on the Duo",notes:[
    ["089","Change","Two-pane layout (unfolded Duo held wide): My Team and Matchup › Players use the same stats table as phones, with room for every category without sliding. The rail keeps the pickers, team card, mini scoreboard and chat; Matchup's team view shows both teams in one table instead of side by side. Display › Roster style › Cards brings back the cards."]]},
  {v:"1.32",date:"2026-10-24",title:"Stats table on phones",notes:[
    ["085","New","Phones: My Team shows your roster as one stats table like ESPN. The player stays on the left and the stats slide sideways, so all your starters and a totals row fit on one screen. One row of buttons picks the day, Week, Season, Proj or Sched."],
    ["086","New","Phones: Matchup has Score · Players · Tracker. Players shows both teams (or one) in the same table for the picked day or the whole week, with a total for each team."],
    ["087","Change","Phones: the header is shorter and scrolls away, the day strip stays pinned at the top, and chat moves to a button next to the team picker so the chat bar no longer covers the screen. My Team's score line links to Matchup."],
    ["088","New","Display (◐) › Roster style: Stats table or Cards (the earlier layout), saved per login."]]},
  {v:"1.31",date:"2026-10-24",title:"Audit fixes",notes:[
    ["082","Fix","Players: the player comparison is back. Tap + next to players to compare them side by side; the team Compare stays in Analytics only."],
    ["083","Fix","Two-pane layout: table column headers stay at the top of the screen when you scroll, instead of sitting at the bottom."],
    ["084","Fix","Phone Matchup card: long team names are cut short with … so they no longer run into the score."]]},
  {v:"1.30",date:"2026-10-24",title:"Using the Duo's right side",notes:[
    ["078","New","Two-pane layout, My Team: a mini scoreboard in the right rail under your team card, with every category now and projected at the end of the matchup. It updates as you change your lineup."],
    ["079","Change","Two-pane layout: player cards open in the right rail instead of a pop-up, so your roster or list stays usable. Tap another player and the card switches to him."],
    ["080","New","Two-pane layout, Matchup: picking your team or theirs shows both rosters side by side, yours on the left, for the same day."],
    ["081","New","Two-pane layout, player cards for players not on your team: what adding him does to your projected categories this matchup, with the projected result before and after."]]},
  {v:"1.29",date:"2026-10-24",title:"Swipe into the next matchup",notes:[
    ["077","New","My Team: swiping past the last day of a matchup (or tapping › on it) goes to the next matchup's first day; swiping back past the first day goes to the previous matchup's last day."]]},
  {v:"1.28",date:"2026-10-24",title:"More room on the Duo",notes:[
    ["076","Change","Two-pane layout: the page buttons (Schedule/Stats and other sub-tabs, player search, Compact) and League's section icons now sit in the right rail too, so the left side starts straight with your content."]]},
  {v:"1.27",date:"2026-10-24",title:"Two-pane layout for the Duo",notes:[
    ["074","New","On an unfolded foldable held wide (like the iPhone Duo), the app splits in two: your roster, matchup or list on the left with the full height, and a rail on the right with the team and matchup pickers, Refresh, the sections, notes, your team card and chat. Auto picks it; you can also choose Two-pane in Display (◐)."],
    ["075","Fix","The phone day picker on My Team no longer leaves a big gap on wide touch screens."]]},
  {v:"1.26",date:"2026-10-23",title:"Hershy matchup view",notes:[
    ["073","New","Display (◐) › Matchup screen › Hershy: ESPN's category board with a day column on each edge. Opponent's day and week on the left, yours on the right, plain numbers with the leader in bold. The day buttons pick which day the outer columns show (Today to start)."]]},
  {v:"1.25",date:"2026-10-23",title:"Simpler Matchup screen",notes:[
    ["068","Change","Matchup is simpler: the middle Matchup view shows just the scoreboard; tap your team or theirs for players, Rosters/Stats, search and the key. One set of day buttons (with each side's starter counts) replaces the big day strip."],
    ["069","Change","One line per category. Tap a category for makes/attempts, the projection and that category's graph for the week; Scoreboard / Tracker buttons under the team switch flip between the board and the full Tracker graphs. Starter games are one line under the board."],
    ["071","Change","Matchup › Tracker shows this week only (day by day running totals), with a link to Compare for anything longer."],
    ["072","New","Analytics › Compare: pick any team against another team, the league average or their opponent each week, over this week, last week, the last 14 days, the season or your own dates. Shows category totals and per-game rates with who leads, plus a chart per category by day or by week, per period or as a running total."],
    ["070","New","Display (◐) has a Matchup screen choice, saved per login: Simple, or Hershy (a placeholder layout that's coming soon and shows Simple for now)."]]},
  {v:"1.24",date:"2026-10-23",title:"Category board by day",notes:[
    ["066","New","Matchup's category board has day buttons (Week, Tue, Wed …). Pick a day to see both teams' categories for just that day, with projections for games still to play; Week shows the whole matchup. The day strip and the board stay in step."],
    ["067","Change","Removed the Matchup 1 · dates heading above the day strip on Matchup, since the matchup is already shown at the top of the app."]]},
  {v:"1.23",date:"2026-10-23",title:"Matchup team switch",notes:[
    ["065","New","Matchup has an ESPN-style switch under the score: your team · Matchup · their team. Pick a team to see only that team's players, with Stats for one day (the day button next to This week; tap a day in the strip to change it). Matchup in the middle shows the category board and both rosters, as before."]]},
  {v:"1.22",date:"2026-10-23",title:"This season in History",notes:[
    ["064","New","Analytics › History now includes 2026-27 (this season). Each day's box scores and shots are saved once every game that day is final, so it fills in as the season goes. Game logs, Season averages, Shots, box scores and the Game filter all work for it, and All seasons includes it."]]},
  {v:"1.21",date:"2026-10-23",title:"Day stats on My Team",notes:[
    ["063","Fix","My Team › Stats now shows the stats for the picked day (the highlighted day) instead of the whole week. A new day button sits next to This week, Season per game and Projected; tap This week for matchup totals."]]},
  {v:"1.20",date:"2026-10-22",title:"Shot selection history",notes:[
    ["060","New","Analytics › History › Shots: every field goal attempt from 2021-22 to 2025-26 (about 1.17 million shots). Pick a player or team to see a hot-zone or every-shot chart, FG% by zone against the NBA average, distance, shot types, assisted makes and quarter splits. Works with all the History filters."],
    ["061","New","History has a Game filter: pick any game (listed newest first, narrowed by the other filters) to see only its stat lines or its shots. A box score also has Shots in this game and Filter to this game buttons."],
    ["062","Fix","Matchup › Tracker: the team key at the top showed two giant circles instead of small color lines."]]},
  {v:"1.19",date:"2026-10-22",title:"History database",notes:[
    ["059","New","Analytics › History: every NBA box score from 2021-22 to 2025-26 (regular season, play-in, playoffs). Search a player, filter by season, team, opponent, game type and minimum points, switch between game logs and season averages, sort any column, and tap a date for the full box score."]]},
  {v:"1.18",date:"2026-10-22",title:"NBA team colors",notes:[
    ["056","New","Display (◐) › Team colors repaints the app in any NBA team's colors, with a team stripe across the top. Saved for your login, in light and dark mode."],
    ["057","Change","Team colors are bolder: the header and phone tab bar take the team color, and the page, card headers, tables, tabs and chat button are tinted to match."],
    ["058","Change","Team colors now blend as smooth gradients from the team's main color into its second color: header, tab bar, page background, card edges and title bars, buttons and the chat button."]]},
  {v:"1.17",date:"2026-10-22",title:"Lock your picks",notes:[
    ["055","New","Pick'em has an optional Lock picks button so a stray tap can't change your picks. Unlock any time before the matchup starts."]]},
  {v:"1.16",date:"2026-10-22",title:"Pick'em gets its own tab",notes:[
    ["054","Change","Pick'em moved from League to its own tab in the main menu (the bottom bar on phones)."]]},
  {v:"1.15",date:"2026-10-22",title:"Trade finder, Pick'em and the record book",notes:[
    ["051","New","Trade finder: Analytics and League › Trades › Find trades suggest fair 1-for-1 swaps that help your weak categories and the other team's, with Compare and Offer this trade."],
    ["052","New","Pick'em: League › Pick'em lets every manager pick the winner of each matchup before it starts, with a season leaderboard."],
    ["053","New","Records: League › Records has your team's Wrapped cards, team records, best single games and a head-to-head grid for the season."]]},
  {v:"1.14",date:"2026-10-22",title:"Access codes save again",notes:[
    ["050","Fix","League › Settings › Access codes: typing a new code now turns on Save codes (it stayed greyed out, so typed codes couldn't be saved)"],
  ]},
  {v:"1.13",date:"2026-10-22",title:"Counter offers, recent chats first",notes:[
    ["048","New","Counter offers: the team that gets a trade offer can tap Counter (in chat or League › Transactions), change the players and send it back. The original offer closes as Countered"],
    ["049","Change","Chat list: the most recent conversation is at the top; teams you haven't messaged yet are listed below"],
  ]},
  {v:"1.12",date:"2026-10-22",title:"Trades in chat, compare trades",notes:[
    ["046","New","Trades in chat: offers, votes and results show as trade cards with live status. Accept, reject, cancel, vote Pass or Veto, and commissioner approve or veto right from chat"],
    ["047","New","Compare players on any trade: each side's players per game (season or ESPN projection), side totals with the better side in green, and the trade check underneath. Also shown while you build a trade offer"],
  ]},
  {v:"1.11",date:"2026-10-22",title:"% rostered",notes:[
    ["044","New","Players: a sortable Rost % column with each player's ESPN % rostered and its daily change"],
    ["045","Change","Player cards show % rostered on ESPN and its daily change at the top, next to the team"],
  ]},
  {v:"1.10",date:"2026-10-22",title:"One bar for Schedule and Stats",notes:[
    ["043","Change","My Team: the roster card starts with one bar that looks the same on Schedule and Stats (team line, day buttons, then Key and the stat view), so switching tabs only changes the table. The picked day's column is highlighted on Schedule"],
  ]},
  {v:"1.9",date:"2026-10-22",title:"Schedule and Stats match",notes:[
    ["041","Change","My Team › Stats: the day buttons now sit inside the roster card, right under the team name, and the card header shows the same played / left / could start line as Schedule"],
    ["042","Fix","My Team › Schedule: the Season column header no longer gets cut off"],
  ]},
  {v:"1.8",date:"2026-10-22",title:"Day buttons on Stats",notes:[
    ["040","Change","My Team › Stats on computers: the Matchup day cards are replaced by the same day buttons as the Schedule table, each showing how many players start"],
  ]},
  {v:"1.7",date:"2026-10-22",title:"Easier daily lineups",notes:[
    ["037","Change","My Team on computers: the day cards above the roster are gone. Each day column in the roster table is now the day picker, showing how many players start that day; click it to see or set that day's lineup"],
    ["038","Change","Moving a player: every choice shows who has a game that day, the best swaps come first, and swaps are tagged +1 game or Loses a game"],
    ["039","Fix","Roster table: the Slot column was too wide and squeezed Sunday's column"],
  ]},
  {v:"1.6",date:"2026-10-22",title:"Waivers and app-owned settings",notes:[
    ["034","New","Waivers: dropped players wait on waivers, teams put in claims (with an optional drop), and claims run on schedule by waiver priority. Your claims, the priority order and who's on waivers are on the Players tab"],
    ["035","New","League › Settings › Waivers: pick rolling, reverse standings or FAAB bidding, how long players wait, and which days and hour claims run. Starts out matching our ESPN league (rolling, 24 hours, Sundays 8 AM ET)"],
    ["036","Change","The app owns its league settings now. Refresh only brings in games, stats, rosters and player news from ESPN, unless the commissioner picks Copy from ESPN under Where settings come from"],
  ]},
  {v:"1.5",date:"2026-10-22",title:"Display settings and foldables",notes:[
    ["032","New","Display settings (the ◐ button): theme and layout, saved to your login so they follow you to any device"],
    ["033","New","iPhone Duo and other foldables: unfolded, the app uses the touch layout with two columns of player cards; folded, the phone layout"],
  ]},
  {v:"1.4",date:"2026-10-22",title:"Draft board",notes:[
    ["030","Change","Draft results open as a draft board: one column per team, one row per round, colored by position, with your picks outlined"],
    ["031","New","Draft results in the live app: the ESPN draft (130 picks) and every move since are copied in, ready for a switch away from ESPN"],
  ]},
  {v:"1.3",date:"2026-10-22",title:"One Refresh at a time",notes:[
    ["029","Fix","Refresh: pressing it on several phones or computers at once no longer starts several ESPN pulls; the whole league shares one 10-minute cooldown"],
  ]},
  {v:"1.2",date:"2026-10-22",title:"Clearer shot charts",notes:[
    ["028","Fix","Shot charts: shots from the same spot no longer stack on top of each other (a make and a miss showed as a green circle with an X)"],
  ]},
  {v:"1.1",date:"2026-10-22",title:"Shot charts from the score, release notes folders",notes:[
    ["026","Change","Tap a player's score for the day (PTS/REB/AST) on My Team to open that game's shot chart"],
    ["027","Change","Release notes have their own button next to ?, with each version as a folder"],
  ]},
  {v:"1.0",date:"2026-10-22",title:"First release",notes:[
    ["001","New","Dial-pad login: each team has its own 6-digit code, plus one commissioner code"],
    ["002","New","Mirrors our ESPN league: rosters, lineups, team names, categories, roster slots and the matchup schedule"],
    ["003","New","Refresh pulls ESPN box scores, injuries and news for everyone, with a 10-minute cooldown"],
    ["004","New","My Team: lineup board with stats and schedule views for every day of the matchup"],
    ["005","New","Phones: compact roster rows with a week strip showing each player's games"],
    ["006","New","Phones: sticky day picker on My Team that counts who plays and who has no game"],
    ["007","New","Lineup alert when a starter has no game and a bench player could start, with Fix lineup"],
    ["008","New","Matchup: live category board and score for any team and week"],
    ["009","New","Players: search and filters, with add, drop and trade buttons"],
    ["010","New","Rising and Falling on ESPN: players being added and dropped the most"],
    ["011","New","Player cards: health, per-game stats, ESPN news and game log"],
    ["012","New","League: scoreboard, standings with playoff bracket, schedule, transactions and NBA schedule"],
    ["013","New","Injury report for rostered players and the latest ESPN stories"],
    ["014","New","Weekly awards on the scoreboard, posted to league chat when a week ends"],
    ["015","New","Power rankings and rivalries on Standings"],
    ["016","New","Analytics: forecast, heat map, strengths and punts, games left, hot and cold players, hot free agents"],
    ["017","New","Streaming planner: free agents who fit your open slots and help your close categories"],
    ["018","New","Trade check: how a trade moves each category for both teams"],
    ["019","New","Trades with a 48-hour league vote, and a pickup limit per matchup"],
    ["020","New","Draft room with queue and autodraft, plus draft results"],
    ["021","New","League chat and direct messages, with a bigger chat bar on phones"],
    ["022","New","Badges for last season's honors next to team and player names"],
    ["023","New","Animations: sliding sheets and chat, swipe between days, gliding lineup moves, ticking numbers, pull to refresh, confetti for a won week"],
    ["024","New","Shot charts: open a played game to see every shot, with splits by zone and how the game moved your shooting categories"],
    ["025","New","Release notes in Help"],
  ]},
];
const relName=r=>{const [y,m,d]=r.date.split("-");return `FantasyBallerz${m}${d}${y.slice(2)} - ${r.v}`;};
const RELTAG={New:"new",Fix:"fix",Change:"chg"};
// its own window from the folder button next to ?: each version is a folder, opened to list its changes
{const dlg=$("#relDlg"),btn=$("#relBtn"),cur=relName(RELEASES[0]),key="dfRelSeen";
 const fico=`<svg class="fico fc" viewBox="0 0 22 18" aria-hidden="true"><path d="M1 3.5V16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1H10L8 2H2a1 1 0 0 0-1 1.5z"/></svg><svg class="fico fo" viewBox="0 0 22 18" aria-hidden="true"><path d="M1 3.5V16l3-8.5a1 1 0 0 1 1-.7h16l-3.2 9.5a1 1 0 0 1-1 .7H2M18 6.8V5.5a1 1 0 0 0-1-1H10L8 2H2a1 1 0 0 0-1 1.5"/></svg>`;
 const fmtD=d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
 $("#relBody").innerHTML=`<p class="relcur muted">Current version: <b>${esc(cur)}</b></p><ul class="reltree">${RELEASES.map((r,i)=>{
   const groups=[["Fix","Bug fixes"],["New","New features"],["Change","Changes"]].map(([t,l])=>[l,r.notes.filter(x=>x[1]===t)]).filter(g=>g[1].length);
   return `<li><details class="relv"${i?"":" open"}><summary>${fico}<span><b>${esc(relName(r))}</b><small>${fmtD(r.date)} · ${esc(r.title)}</small></span><span class="relcnt">${r.notes.length} ${r.notes.length===1?"change":"changes"}</span></summary>
     <div class="relsub">${r.all?`<p class="muted">This first go-live release includes every feature released so far:</p><ul class="rell">${RELEASES.slice(i+1).map(o=>`<li><span class="relid">${esc(o.v)}</span><span>${esc(o.title)}</span></li>`).join("")}</ul>`:""}${groups.map(([l,ns])=>`<h4>${l}</h4><ul class="rell">${ns.map(([id,t,txt])=>`<li><span class="relid">BUG - ${id}</span><span>${esc(txt)}</span></li>`).join("")}</ul>`).join("")}</div></details></li>`;}).join("")}</ul>`;
 let seen="";try{seen=localStorage.getItem(key)||"";}catch(e){}
 if(btn&&seen!==cur)btn.classList.add("hasnew");
 btn.onclick=()=>{dlg.showModal();$("#relBody").scrollTop=0;btn.classList.remove("hasnew");try{localStorage.setItem(key,cur);}catch(e){}};
 $("#relClose").onclick=()=>dlg.close();dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close();});}
