# Memoria Lost Discord Bot

An immersive RPG Discord bot where players climb the Babel Tower, summon servants from popular anime series, and engage in strategic turn-based battles against mythological deities.

## 🎮 Features

- **Gacha System**: Summon servants with different rarities (4★-6★) from popular anime series
- **JRPG-Style Combat**: Turn-based battles with Attack, Defend, and Skill options
- **Tower Climbing**: Progress through floors defeating increasingly powerful enemies
- **Team Building**: Form teams of 3-4 servants with strategic positioning
- **Character Progression**: Level up servants, build bonds, and equip items
- **Equipment System**: Collect and equip weapons, armor, and accessories
- **Daily Rewards**: Login bonuses and stamina system

## 📋 Prerequisites

- Node.js v16.0.0 or higher
- MySQL 8.0 or MariaDB
- Discord Developer Account
- Git

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/memoria-lost-bot.git
cd memoria-lost-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "Memoria Lost")
3. Go to the "Bot" section
4. Click "Add Bot"
5. Click "Reset Token" and copy the token (you'll need this later)
6. Under "Privileged Gateway Intents", enable:
   - MESSAGE CONTENT INTENT
7. Go to "OAuth2" → "URL Generator"
8. Select scopes:
   - `bot`
   - `applications.commands`
9. Select bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Add Reactions
   - Use External Emojis
   - Manage Messages
10. Copy the generated URL and invite the bot to your server

### 4. Set Up Database

#### Option A: Using Docker (Recommended)
```bash
docker run --name memoria-mysql -e MYSQL_ROOT_PASSWORD=yourpassword -e MYSQL_DATABASE=memoria_lost -p 3306:3306 -d mysql:8.0
```

#### Option B: Using XAMPP
1. Download and install [XAMPP](https://www.apachefriends.org/)
2. Start MySQL from XAMPP Control Panel
3. Open phpMyAdmin (http://localhost/phpmyadmin)
4. Create a new database named `memoria_lost`

#### Option C: Direct MySQL Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server
sudo mysql -u root -p

# In MySQL prompt:
CREATE DATABASE memoria_lost;
EXIT;
```

### 5. Configure the Bot

Create a `config.json` file in the root directory:

```json
{
    "token": "YOUR_BOT_TOKEN_HERE",
    "prefix": "!",
    "ownerId": "YOUR_DISCORD_USER_ID",
    "database": {
        "host": "localhost",
        "user": "root",
        "password": "yourpassword",
        "database": "memoria_lost"
    }
}
```

**To get your Discord User ID:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your username and select "Copy User ID"

### 6. Populate Initial Data

```bash
node scripts/populateData.js
```

You should see:
```
Database connection established.
Database synchronized.
Populating servants...
Populated 45 new servants (45 total in database)
Populating items...
Populated 27 new items (27 total in database)

✅ Data population complete!
```

### 7. Start the Bot

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## 📁 Project Structure

```
memoria-lost-bot/
├── index.js              # Main bot entry point
├── config.json           # Configuration file
├── package.json          # Dependencies
├── commands/             # Bot commands
│   ├── start.js         # Start adventure
│   ├── profile.js       # View player stats
│   ├── battle.js        # JRPG battle system
│   ├── summon.js        # Gacha summoning
│   ├── team.js          # Team management
│   ├── servants.js      # View collection
│   ├── shop.js          # Item shop
│   ├── inventory.js     # View items
│   ├── equip.js         # Equipment management
│   ├── daily.js         # Daily rewards
│   ├── bond.js          # Servant_old bonds
│   ├── help.js          # Command list
│   └── admin.js         # Admin commands
├── database/
│   ├── Database.js      # Database connection
│   └── models/          # Sequelize models
│       ├── Player_old.js
│       ├── Servant_old.js
│       ├── PlayerServant.js
│       ├── Item.js
│       ├── PlayerItem.js
│       └── Battle.js
├── events/
│   ├── ready.js         # Bot ready event
│   └── messageCreate.js # Message handler
├── utils/
│   ├── ElementalSystem.js    # Elemental combat
│   ├── GachaSystem.js        # Summoning logic
│   ├── BattleEngine.js       # Old battle system
│   └── JRPGBattleEngine.js   # New JRPG battle
├── data/
│   └── servantData.js   # Servant_old definitions
└── scripts/
    └── populateData.js  # Database seeder
```

## 🎮 Commands

### Basic Commands
- `!start` - Begin your adventure (creates account)
- `!profile` - View your stats, level, and team
- `!help` - List all available commands

### Battle & Progression
- `!battle` - Fight in the Babel Tower
- `!team` - Manage your battle formation
- `!servants` - View your servant collection

### Gacha & Economy
- `!summon` - Summon new servants (150/1500 gold)
- `!shop` - Buy equipment items
- `!inventory` - View your items
- `!daily` - Claim daily rewards

### Character Management
- `!equip` - Equip items to servants
- `!bond` - View servant bond levels

### Admin Commands (Owner Only)
- `!admin give gold <amount>` - Give yourself gold
- `!admin give servant <name>` - Give specific servant
- `!admin set level <level>` - Set your level
- `!admin maxservant <name>` - Max out a servant

## 🎯 Game Mechanics

### Servant_old Rarities
- 4★ Common (70% chance)
- 5★ Epic (25% chance)
- 6★ Legendary (5% chance)

### Elemental System
- Fire → Wind → Earth → Electric → Water → Fire
- Ice weak to Fire
- Light ↔ Dark (mutual strength)

### Battle System
1. **Turn-based combat** with individual character actions
2. **Action Types**:
   - Attack: Basic attack (no AP cost)
   - Defend: Reduce damage by 50%, restore 10 AP
   - Skills: Powerful abilities that cost AP
3. **AP System**: Start with 100 AP, regenerate 20 per turn
4. **Team Composition**: Tank (Slot 1), DPS (Slots 2-3), Support (Slot 4)

### Stamina System
- Start with 100 stamina
- +10 max stamina per level up
- Regenerates 1 point every 4 minutes
- Battle costs: 10 (normal), 15 (elite), 20 (boss)

## 🛠️ Development

### Adding New Servants

Edit `data/servantData.js`:
```javascript
{
    name: 'Character Name',
    series: 'Anime Series',
    rarity: 5, // 4-6
    element: 'fire', // fire/water/earth/wind/electric/ice/light/dark
    role: 'dps', // dps/tank/healer/support/control
    baseAtk: 85,
    baseDef: 60,
    baseHp: 120,
    baseSpd: 75,
    skillName: 'Skill Name',
    skillDescription: 'What the skill does',
    skillPower: 150,
    passiveName: 'Passive Name',
    passiveDescription: 'Passive effect'
}
```

Then run: `node scripts/populateData.js`

### Adding New Commands

Create a new file in `commands/`:
```javascript
module.exports = {
    name: 'commandname',
    description: 'What it does',
    aliases: ['cmd', 'c'],
    cooldown: 5,
    async execute(message, args) {
        // Command logic here
    }
};
```

### Database Migrations

After modifying models:
```bash
# This will sync the database (ALTER tables)
npm start
```

## 🐛 Troubleshooting

### Bot Not Responding
- Check bot token in config.json
- Ensure bot has proper permissions in Discord
- Check console for errors
- Verify prefix (!command not /command)

### Database Connection Failed
- Ensure MySQL is running
- Check credentials in config.json
- Verify database exists: `CREATE DATABASE memoria_lost;`

### "This interaction failed"
- Restart the bot
- Check for JavaScript errors in console
- Ensure all required files exist

### Docker Issues
- Make sure Docker Desktop is running
- Check if port 3306 is already in use
- Try: `docker ps` to see running containers

## 📝 Environment Variables (Optional)

Instead of config.json, you can use a `.env` file:
```env
BOT_TOKEN=your_bot_token
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=memoria_lost
OWNER_ID=your_discord_id
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---