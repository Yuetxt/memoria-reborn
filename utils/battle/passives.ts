import {Effect} from "./effect";
import {Fighter} from "./fighter";
import {BattleEngine} from "./engine";
import {
    BaseAlteration,
} from "./alterations";
import {Element} from "../types/battle";
import {PASSIVES} from "./catalog/passives";
import {EffectLike, Skill} from "./skills";


// Board effect : fonction qui s'execute a un instant précis du combat.
// Params : caster = le joueur qui possède l'effet de bord, e = engine, data = données spécifiques aux evenements.
// Renvoie une donnée pouvant affecter le cours du combat
export type BaseBoardFunction<T = null, R = void> = (caster: Fighter, e: BattleEngine, data?: T) => R

// Tous les évènements possibles, avec les données qui correspondent
export type BoardEffect = {
    id?: string, // Pour potentiellement l'enlever
    onAttack?: BaseBoardFunction<{ target: Fighter, dmg: number }, number>, // Renvoie le nouveau nombre de dégat
    valideDamage?: BaseBoardFunction<{ dmg: number, element: Element, source: Fighter | string }, number>, // Idem
    onDamage?: BaseBoardFunction<{ dmg: number, element: Element, source: Fighter | string }>, // Idem
    onAlter?: BaseBoardFunction<BaseAlteration, boolean>, // true si l'altération est acceptée
    onHeal?: BaseBoardFunction<number, number>, // Renvoie le nouveau nombre de heal
    validateSkill?: BaseBoardFunction<Skill>,
    onSkill?: BaseBoardFunction<Skill>,
    onAct?: BaseBoardFunction<Skill>,
    onTurnStart?: BaseBoardFunction,
    onTurnEnd?: BaseBoardFunction,
    onBattleStart?: BaseBoardFunction
    onDie?: BaseBoardFunction
}
// Les effets de boards peuvent être créés en utilisant des effets normaux
type BoardEffectLike = {
    [K in keyof BoardEffect]?: BoardEffect[K] | EffectLike[];
} & {
    id?: string;
};

// Passives are passives effects in the game and rely on board effects.
// But they need description data and all for user
export type Passive = {
    id: string,
    name?: string
    boards: BoardEffectLike[]
}

// Get the board effects linked to the passive
export function getBoardEffect(e: string | Passive) {
    let passive: Passive = typeof e === "string"? PASSIVES.find(p => p.id == e) : e;
    if(!passive) return []

    const boardEffects: BoardEffect[] = []
    for (const effect of passive.boards) {
        const boardEffect: BoardEffect = {}
        for (const key of Object.keys(effect)) {
            if (key === "id") { // keep the id
                boardEffect.id = effect.id
                continue
            }
            if (typeof effect[key] == "function") {
                boardEffect[key] = effect[key]
            } else if (Array.isArray(effect[key])) {
                const effects = effect[key].map((el) => Effect.from(el))
                boardEffect[key] = (t, en, d) => {
                    effects.map(ef => ef.execute(t, en, [t]))
                    return d
                }
            }
        }
        boardEffects.push(boardEffect)
    }
    return boardEffects
}