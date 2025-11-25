import gachaConfig from "../config/gacha.json"
import servants from "../data/servants.json"

export function adjustRate(rates: number[], index: number, delta: number): number[] {
    const newRates = [...rates];
    
    // Calculate the current value after applying delta, ensuring it doesn't go below 0 or above 1
    const newValue = Math.max(0, Math.min(1, newRates[index] + delta));
    const actualDelta = newValue - newRates[index];
    
    // Calculate the total of all other rates
    const otherRatesTotal = newRates.reduce((sum, rate, i) => i === index ? sum : sum + rate, 0);
    
    // If there are no other rates or they sum to 0, we can't maintain proportions
    if (otherRatesTotal <= 0) {
        throw new Error('Cannot maintain proportions: other rates sum to 0');
    }
    
    // Calculate the scale factor to maintain proportions
    const scale = (otherRatesTotal - actualDelta) / otherRatesTotal;
    
    // Update all rates to maintain proportions
    for (let i = 0; i < newRates.length; i++) {
        if (i === index) {
            newRates[i] = newValue;
        } else {
            newRates[i] = Math.max(0, newRates[i] * scale);
        }
    }
    
    // Normalize to ensure the sum is exactly 1 (accounting for floating point errors)
    const sum = newRates.reduce((a, b) => a + b, 0);
    return newRates.map(rate => rate / sum);
}
export function normalizeRates(input: number[]): number[] {
    const EPS = 1e-12;
    const vals = input.map(v => (isFinite(v) ? Math.max(0, v) : 0));
    const n = vals.length;
    const total = vals.reduce((s, v) => s + v, 0);

    if (n === 0) return [];
    if (Math.abs(total - 1) < EPS) return vals.slice(); // already sums to ~1
    if (total === 0) return Array(n).fill(1 / n); // distribute equally

    const scaled = vals.map(v => v / total);
    // fix any tiny floating-point error so sum is exactly 1
    const sumScaled = scaled.reduce((s, v) => s + v, 0);
    scaled[n - 1] = Math.max(0, scaled[n - 1] + (1 - sumScaled));
    return scaled;
}
function generateRarity(rates: number[]) {
    const n = Math.random()
    let sum = 0
    for (let i = 0; i < rates.length; i++) {
        sum += rates[i]
        if (n < sum) {
            return i
        }
    }
    return rates.length - 1
}

export function summonServant(pulls: number = 0) {
    let rarity: number = 0
    let rates = [...gachaConfig.rarityDropRates]

    if (pulls >= gachaConfig.increaseTrigger) {
        // Calculate the increase for the last rarity
        const incPerPull = (1 - gachaConfig.rarityDropRates[gachaConfig.rarityDropRates.length - 1]) / 
                          (gachaConfig.forceMaxRarity - gachaConfig.increaseTrigger);
        const inc = (pulls - gachaConfig.increaseTrigger) * incPerPull;
        rates = adjustRate(rates, rates.length - 1, inc);
    }
    rarity = generateRarity(rates)
    const servant = Object.keys(servants)[Math.floor(Math.random() * Object.keys(servants).length)]

    return {id: servant, rarity}
}

