import {AttachmentBuilder} from "discord.js";
import * as path from "node:path";
import servants from "../../data/servants.json"
import floorData from "../../data/floors.json"

export function lifeBar(
    chars: number,
    percent: number,
    options?: { filledChar?: string; emptyChar?: string; showPercent?: boolean }
): string {
    const filledChar = options?.filledChar ?? ':green_square:';
    const emptyChar = options?.emptyChar ?? ':black_large_square:';
    const showPercent = options?.showPercent ?? false;

    const total = Math.max(1, Math.floor(chars));
    const p = Math.max(0, Math.min(1, percent));
    const filled = Math.round((p) * total);
    const empty = total - filled;

    const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);
    return showPercent ? `${bar} ${Math.round(p * 100)}%` : bar;
}

/**
 * Creates a double life bar with two progress indicators
 * @param chars - Total length of the bar
 * @param firstPercent - First percentage (0-1)
 * @param secondPercent - Second percentage (0-1)
 * @param options - Configuration options
 * @returns A string representing the combined life bar
 */
export function doubleLifeBar(
    chars: number,
    firstPercent: number,
    secondPercent: number,
    options?: {
        firstChar?: string;
        secondChar?: string;
        emptyChar?: string;
        showPercent?: boolean;
        showSecondPercent?: boolean;
    }
): string {
    const firstChar = options?.firstChar ?? ':green_square:';
    const secondChar = options?.secondChar ?? ':blue_square:';
    const emptyChar = options?.emptyChar ?? ':black_large_square:';
    const showPercent = options?.showPercent ?? false;
    const showSecondPercent = options?.showSecondPercent ?? showPercent;

    const bar1 = lifeBar(chars, firstPercent, {
        filledChar: firstChar,
        emptyChar: emptyChar
    }).replaceAll(emptyChar, "e").replaceAll(firstChar, "f")
    const bar2 = lifeBar(chars, secondPercent, {
        filledChar: secondChar,
        emptyChar: emptyChar
    }).replaceAll(emptyChar, "e").replaceAll(secondChar, "s").split("").reverse().join("")
    const chart = {
        "e": emptyChar,
        "f": firstChar,
        "s": secondChar
    }
    let bar = ""
    for (let i = 0; i < chars; i++) {
        const b1 = bar1[i]
        const b2 = bar2[i]
        if (b2 === "e") {
            bar += chart[b1]
        } else {
            bar += chart[b2]
        }
    }
    return bar
}

export function chance(percent: number) {
    return Math.random() < percent / 100
}

export function createAttachment(p) {
    const attachment = new AttachmentBuilder(path.join(process.cwd(), p))
    return `attachment://${p.split("/").pop()}`
}

import fs from 'fs/promises';
import sharp from 'sharp';
import {Passive} from "./passives";
import {SkillShort} from "./skills";
import {Fighter} from "./fighter";
import {BattleEngine} from "./engine";
import {BattleStats} from "../types/battle";
import {green, red} from "../ansiFormatter";


export function toSkillId(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove punctuation
        .trim()
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

/**
 * Selects a random item from an array based on provided weights
 * @param items Array of items to choose from
 * @param weights Array of weights corresponding to each item (higher = more likely)
 * @returns The selected item from the array
 * @throws If arrays are empty or have different lengths
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
    if (items.length === 0 || weights.length === 0) {
        throw new Error("Items and weights arrays must not be empty");
    }
    if (items.length !== weights.length) {
        throw new Error("Items and weights arrays must have the same length");
    }

    // Calculate total weight
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) {
        throw new Error("Total weight must be greater than 0");
    }

    // Generate a random number between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Find the item where the random number falls in its weight range
    for (let i = 0; i < items.length; i++) {
        if (random < weights[i]) {
            return items[i];
        }
        random -= weights[i];
    }

    // Fallback to last item (should theoretically never reach here if weights are valid)
    return items[items.length - 1];
}

function rndChoice(list) {
    return list[Math.floor(Math.random() * list.length)]
}

// Shortcuts get targets
const enemy = (p: Fighter, e: BattleEngine) => [e.aliveDiff(p)[0]]
const enemies = (p: Fighter, e: BattleEngine) => e.aliveDiff(p)
const ally = (p: Fighter, e: BattleEngine) => [e.aliveSame(p)[0]]
const allies = (p: Fighter, e: BattleEngine) => e.aliveSame(p)
const randomEnemy = (p: Fighter, e: BattleEngine) => [rndChoice(e.aliveDiff(p))]
const randomAlly = (p: Fighter, e: BattleEngine) => [rndChoice(e.aliveSame(p))]

export const targetsStrings = {
    "all_a": allies,
    "all_e": enemies,
    "fst_a": ally,
    "fst_e": enemy,
    "rnd_a": randomAlly,
    "rnd_e": randomEnemy,
    "self": (p: Fighter, e: BattleEngine) => [p]
}

export function shuffle(a: any[]) {
    let array = [...a]
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array
}

export function getStatsString(stats: Partial<BattleStats>, color = false): string {
    const statNames: Record<string, string> = {
        'hp': 'HP',
        'atk': 'ATK',
        'def': 'DEF',
        'spd': 'SPD',
        'acc': 'ACC',
        'crit_chance': 'CRIT',
        'crit_dmg': 'CRIT DMG',
        'evs': 'EVS',
        'maxHp': 'MAX HP',
        "dmg_taken": "Dmg taken",
        "dmg_dealt": "Dmg dealt"
    };

    return Object.entries(stats)
        .map(([key, value]) => {
            const statName = statNames[key] || key.replaceAll("_", " ").toUpperCase();
            const sign = value >= 0 ? '+' : '-';
            const absValue = Math.abs(Math.round(value));
            const txt = `${statName}${sign}${absValue}%`
            let buff = value >= 0
            if(key === "dmg_taken") {
                buff = !buff
            }
            return color ? buff ? green(txt) : red(txt) : txt;
        })
        .join(', ');
}

