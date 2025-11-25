# New version setup

## Global setup
Run `npm install` to install dependencies

## Db setup

For the testing phase, let's use a simple sqlite local storage db so there's no need to setup anything

## Assets

### Setup

Assets are ignored in the github repository so you need to setup them locally.
Assets are stored in the public folder. And should follow the following structure :

```
public/
├── servants/
    ├── <series>
        ├── <servant_id>.png
        ...
    ...
├── monsters
    ├── floor-<i>
        ├── <id>.png
        ...
    ...
```

The series should match the series in the `data/servants.json` file, same for ids, same for mobs id. Floors index starts
at 1.
You can use spaces and uppercases when making the structure, `npm run statics` will format the filenames and reduce the
size of too large images.

### Run

You'll need to serve the assets with a static server, you can use `npm run server` will start one on the configured
port.
To make it available to discord you should either have a domain name that points to your server, or use a tunnel like
cloudflared.

## Discord

### Config

Follow the following guides :

- [Creating app](https://discordjs.guide/legacy/preparations/app-setup)
- [Adding app to server](https://discordjs.guide/legacy/preparations/adding-your-app)

Then copy your bot token (found in the bot section of the dev portal), and the application ID (found in general
informations) in the `config.json` file (applicationId = clientID).

### Deploy
Simply run `npm run deploy` to deploy the commands to discord.

### Run 
Once everything setup you should be able to run the bot with `npm run start`


## Features
### Battle
#### Config
You have a battle config file at `config/battle.json` that works as following: 
```json
{
  "actionTurnDuration": <Time left to user to select an action>,
  "nonActionTurnDuration": <Time to show end turn log of monster turn>,
  "maxSp": <Max sp for the team>,
  "startSp": <Sp at the start of the fight>,
  "bossStaminaCost": <Stamina cost for boss battle>,
  "baseStaminaCost": <Stamina cost for normal battle>,
  "simpleFight": { // Setup for the normal battle
    "skillCooldowns": [ // Cooldowns for attacks/skills (first is attack, then skill 1, 2, etc)
      0,
      1,
      2,
  
    ],
    "skillProb": [ // Skill probability (same as cooldowns)
      0.4,
      0.3,
      0.3
    ]
  },
  "bossFight": { // Setup for the boss battle
    "skillCooldowns": [
      0,
      1,
      2,
      3
    ],
    "skillProb": [
      0.4,
      0.3,
      0.2,
      0.1
    ]
  },
  "secondPhaseFight": { // Setup for the second phase of the boss battle
    "skillCooldowns": [
      0,
      1,
      2,
      3
    ],
    "skillProb": [
      0.2,
      0.3,
      0.25,
      0.25
    ]
  }
}
```

### Commands
Currently you use the following commands :
- /start : Start your adventure (needed to use the others)
- /summon : Summon 5 servants (for the moment, will implement a pack system)
- /team : Compose your team for fight
- /battle : Start a fight