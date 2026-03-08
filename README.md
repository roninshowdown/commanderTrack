# commanderTrack

# Overview
This is a Magic the Gathering Life Tracker app which also tracks Timer.

## Technical Requirements
- Built with SvelteKit and TypeScript
- Progressive Web App capabilities (offline support, installability, responsive UI)
- Login System and Access Control use  Firebase


## Software Requirements
### Admin Mode
- Add Players
- Add Decks
- Modify Players (all parameters in this section)
- Modify Decks (all parameters in this section)
- Delete Players
- Delete Decks

### Profiles
#### Player

Parameters:
- Name
- Image (optional) use image from ( https://scryfall.com/docs/api of commander name)
- Player Decks (a player can have multiple decks; a deck belongs only to one player)
	- Commander Name
	- Commander Image
	- Colors (optional): MTG colors - red, blue, black, yellow, green

#### Game Setup
- Choose Players
- For each player, choose a deck
- Set Max Life (default 40)
- Choose timer variant (A or B) and configure the required fields for the selected mode
  - Variant A: No reaction time. Shared Start Time is used for all players at the beginning of the game. After it expires, the active player’s pool time (player time) is used. Player time equals pool time in Variant A.
  - Set Pool time (default 30 minutes)
  - Set Shared Start Time (default 10 minutes)
- Variant B:
  - Main pool: duration every player starts with (default 30 minutes).
  - Player time (formerly Turn time): budget used when it is the player’s turn. Player time always reflects the active player’s available time (default 2 minutes).
  - Reaction time (formerly Priority time): budget used when a non-active player is reacting. Reaction time always reflects a reactive player’s available time (default 1 minute).
  - Set ScaleFactor Player Time (default 10 seconds per turn)
  - Set ScaleFactor Reaction Time (default 10 seconds per reaction)
  - A round is when every player has had one turn. After each round, the scale factors are added incrementally to player time and reaction time. E.g.
  - Round 1: Player time = 2 minutes, Reaction time = 1 minute
  - Round 2: Player time = 2 minutes + 10 seconds, Reaction time = 1 minute + 10 seconds
  - Round 3: Player time = 2 minutes + 20 seconds, Reaction time = 1 minute + 20 seconds
  - Round 4: Player time = 2 minutes + 30 seconds, Reaction time = 1 minute + 30 seconds
  - Round 5: Player time = 2 minutes + 40 seconds, Reaction time = 1 minute + 40 seconds
  - Round 6: Player time = 2 minutes + 50 seconds, Reaction time = 1 minute + 50 seconds
  - Round 7: Player time = 2 minutes + 1 minute, Reaction time = 1 minute + 1 minute
- Every player has its own pool time
- Player time is always used for the active player (the player whose turn it is)
- Reaction time applies to a reactive player (a player who is currently reacting and NOT the active player)
- If reaction time is empty, the reactive player’s pool time is used.
- If player time is empty, the player whose turn it is uses their pool time.
- Only one timer can run at a time: player time, reaction time, or pool time.


### Turn and Timer Algorithm
- Start of the Game if Start/Stop-Button is clicked
	- Variant A: No reaction time. Shared Start Time is used for all players. After it expires, the active player's pool time (player time) is used.
	- Variant B:
		- Player time is used for the active player
		- If player time is over, the active player's pool time is used
		- If reaction time is over, the reactive player's pool time is used
- Only one timer can be running at all times
- Active player refers to the player whose turn it is.
- Reactive player refers to a non-active player who is currently reacting.
- If a player passes priority to a reactive player, the reaction timer is reset to the current scaled value for that reactive player.
- If the reactive player returns priority to the active player, the reaction time is reset.
- If priority returns to the active player, the player time continues without resetting.
- Turns can only be passed by the player whose current turn it is.




### Life Tap
- PlayerLife
- Commander damage taken (per commander, standard 21 to lose)
- Total Life gained
- Total Life lost

### Log
- Log every change done per player
- Who, Value (single signed value: Gain or Loss), Timestamp
- Shall be table format, quickly accessible.

### Rank (optional)
#### Build a dashboard to display ranks. Illustrative examples:
- Rank the players based on the number of games played
- Rank the players based on the number of games won
- Rank the players based on the number of games lost
- Rank the decks based on the number of games played
- Rank the decks based on the number of games won
- Rank the decks based on the number of games lost

Win/Loss rules: A player is dead when their life reaches 0. Dead players cannot be set as active or reactive and cannot interact in any way. A button in the center allows the winner to be selected to finish the game.

### UI
Style: Clean, modern,IOS like.
GameUI

- 2-6 players, configurable. Empty tiles per player can be clicked to select the player and the deck
- Tiles selected for Player and decks show Commander Image 
- Tiles selected for Player and decks show Life as Number in the center of the tile
- Tiles selected for Player and decks show current pooltime at the bottom of the tile
- Player tiles can be clicked to select the player and the deck
- One LTT/RTT pair per tile. LTT-Button (left of tile) decreases player life, RTT-Button (right of tile) increases player life
- Long hold on RTT or LTT is - 10 or + 10 player life
- optional: play different sounds for player life gain or loss
- GlobalCommanderDamage-Button is a button (toggle) that enables commander damage 
  - Select Commander damage Source Tile
  - Then Select Commander damage Target Tile
  - Apply damage with RTT or LTT to the target tile
  - Exit CommanderDamage-Mode by clicking the GlobalCommanderDamage-Button again
- Setup Button in center of screen to open Setup Menu
- Pick Random Opponent button to pick a random opponent as the reactive player
- Big Start/Stop-Button in center of screen to stop all timers
- Green Circle Indicator around active player tile to show which player's turn it is
- Small Red Circle Indicator around player tiles whose time is currently counting down (Player time, Reaction time, or Pool time)
- Pulsing Tile to show if current player time or reaction time is close (10s left) to 0. Pulse until 0.
- Next player's turn button: the only way to pass the turn to the next player




