import {Fighter} from "./fighter";
import {BattleEngine} from "./engine";


export type Stats = {
    atk: number,
    def: number,
    spd: number,
    hp: number,
    maxHp: number,
    // currentHp: number,
    damageTakenMultiplier: number,
    damageDealtMultiplier: number,
}

export type Skill = {
    id: string,
    name: string,
    description: string,
    targetNumber: number,
    cost: number,
    execute: (player: Fighter,targets: Fighter[], battle: BattleEngine) => string,
    ally?: boolean | null,
    filterTarget?: (f: Fighter) => boolean
    getTargets?: (player: Fighter, engine: BattleEngine) => Fighter[]
    needFeedback?: boolean | null
}

export function stats(s): Stats  {
    return {
        atk: 0,
        def: 0,
        spd: 0,
        hp: 0,
        maxHp: 0,
        damageTakenMultiplier: 1,
        damageDealtMultiplier: 1,
        ...stats
    }
}
