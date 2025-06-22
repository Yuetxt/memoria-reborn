const elementalChart = {
    fire: { weak: 'water', strong: 'wind' },
    water: { weak: 'electric', strong: 'fire' },
    earth: { weak: 'wind', strong: 'electric' },
    wind: { weak: 'fire', strong: 'earth' },
    electric: { weak: 'earth', strong: 'water' },
    ice: { weak: 'fire', strong: 'wind' },
    light: { weak: 'dark', strong: 'dark' },
    dark: { weak: 'light', strong: 'light' }
};

function calculateElementalDamage(attackerElement, defenderElement, baseDamage) {
    // Base elemental resistance is 10%
    let multiplier = 0.9;
    
    // Same element = 20% resistance
    if (attackerElement === defenderElement) {
        multiplier = 0.8;
    }
    // Elemental advantage = 40% bonus damage
    else if (elementalChart[attackerElement]?.strong === defenderElement) {
        multiplier = 1.4;
    }
    // Elemental disadvantage = 20% less damage
    else if (elementalChart[attackerElement]?.weak === defenderElement) {
        multiplier = 0.8;
    }
    
    return Math.floor(baseDamage * multiplier);
}

module.exports = {
    elementalChart,
    calculateElementalDamage
};