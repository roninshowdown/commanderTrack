# commanderTrack

## Technical Requirements
- Built with React and TypeScript
- Progressive Web App capabilities (offline support, installability, responsive UI)
- TODO: Login System and Access Control (maybe Firebase?)


## Software Requirements
### Admin Mode
- Add Players
- Add Decks
- Modify Players

### Profiles
#### Player

Parameters:
- Name
- Image (optional)
- Player Decks
	- Commander Name
	- Commander Image
	- Colors (optional)
####

#### Game Setup
- Chose Players
- For each player, chose a deck
- Set Max Life (default 40)
- StartTimer: Set if not default
- Countdown Timer: Set if not default

### Life Tap
- PlayerLife
- Commander damage taken
- log every change done per player (optional)
- Total Life gained
- Total Life lost



### Timer
- StartTimer: After X minutes, the StartTimer will trigger the players TurnTimers.
Variant A:
Every player has the same start time. Each player loses its time when its his turn or reaction slot.
Variant B:
Each player has a fixed main pool of total time, and a separate turn/priority pool that refreshes every time they gain priority. The turn/priority pool provides a limited amount of time that scales with game progress, and once it is empty, additional time is drained from the player’s main pool. The main pool never refills, and the turn/priority pool never refunds unused time. A player loses when their main pool reaches zero.



### Log
- Log every change done per player
- Who, What, Value, When Global

### Rank


### UI
