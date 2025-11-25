import {BattleEngine} from "./engine";

import {ContainerBuilder, EmbedBuilder} from "discord.js";
import {Fighter} from "./fighter";


function createTeamEmbed(battle: BattleEngine) {
    return new ContainerBuilder().setAccentColor(0x0099ff)
        .addSectionComponents(battle.fighters.filter(f => f.isPlayer).map(f => f.section))
}

function createTurnEmbed(fighter: Fighter) {
    return new EmbedBuilder().setTitle("Turn")
}
function createActionRow(fighter: Fighter) {

}