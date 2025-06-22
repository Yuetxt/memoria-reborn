class VisualEffects {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.particles = [];
        this.animations = [];
        this.screenEffects = [];
        this.damageNumbers = [];
    }
    
    // Update all effects
    update() {
        this.updateParticles();
        this.updateAnimations();
        this.updateScreenEffects();
        this.updateDamageNumbers();
    }
    
    // Render all effects
    render() {
        // Render in correct order for layering
        this.renderScreenEffects();
        this.renderParticles();
        this.renderAnimations();
        this.renderDamageNumbers();
    }
    
    // Particle effects
    createParticles(x, y, type, count = 20) {
        const configs = {
            hit: {
                color: ['#ff0000', '#ff6600', '#ffff00'],
                speed: 3,
                size: 4,
                lifetime: 30,
                gravity: 0.2
            },
            heal: {
                color: ['#00ff00', '#00ff88', '#88ff88'],
                speed: 2,
                size: 3,
                lifetime: 40,
                gravity: -0.1
            },
            magic: {
                color: ['#0088ff', '#00ffff', '#8888ff'],
                speed: 2.5,
                size: 5,
                lifetime: 50,
                gravity: 0
            },
            explosion: {
                color: ['#ff0000', '#ff6600', '#ffff00', '#ffffff'],
                speed: 5,
                size: 6,
                lifetime: 40,
                gravity: 0.3
            }
        };
        
        const config = configs[type] || configs.hit;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = config.speed + Math.random() * 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: config.color[Math.floor(Math.random() * config.color.length)],
                size: config.size + Math.random() * 2,
                lifetime: config.lifetime,
                maxLifetime: config.lifetime,
                gravity: config.gravity,
                type: type
            });
        }
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.gravity;
            particle.lifetime--;
            
            // Fade out
            particle.alpha = particle.lifetime / particle.maxLifetime;
            
            return particle.lifetime > 0;
        });
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            
            // Glow effect
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            gradient.addColorStop(0, particle.color);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    // Animation effects
    createSlashEffect(startX, startY, endX, endY, color = '#ffffff') {
        this.animations.push({
            type: 'slash',
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: color,
            progress: 0,
            duration: 10,
            width: 5
        });
    }
    
    createImpactEffect(x, y, radius = 50, color = '#ffff00') {
        this.animations.push({
            type: 'impact',
            x: x,
            y: y,
            radius: radius,
            maxRadius: radius,
            color: color,
            progress: 0,
            duration: 15
        });
    }
    
    createAuraEffect(x, y, radius = 40, color = '#00ffff', duration = 60) {
        this.animations.push({
            type: 'aura',
            x: x,
            y: y,
            radius: radius,
            color: color,
            progress: 0,
            duration: duration,
            pulsePhase: 0
        });
    }
    
    updateAnimations() {
        this.animations = this.animations.filter(anim => {
            anim.progress++;
            
            if (anim.type === 'slash') {
                // Slash moves quickly across the path
                const t = anim.progress / anim.duration;
                anim.currentX = anim.startX + (anim.endX - anim.startX) * t;
                anim.currentY = anim.startY + (anim.endY - anim.startY) * t;
            } else if (anim.type === 'impact') {
                // Impact ring expands outward
                const t = anim.progress / anim.duration;
                anim.currentRadius = anim.radius * t;
                anim.alpha = 1 - t;
            } else if (anim.type === 'aura') {
                // Aura pulses
                anim.pulsePhase += 0.1;
            }
            
            return anim.progress < anim.duration;
        });
    }
    
    renderAnimations() {
        this.animations.forEach(anim => {
            this.ctx.save();
            
            if (anim.type === 'slash') {
                const alpha = 1 - (anim.progress / anim.duration);
                this.ctx.globalAlpha = alpha;
                this.ctx.strokeStyle = anim.color;
                this.ctx.lineWidth = anim.width;
                this.ctx.lineCap = 'round';
                
                // Draw trail
                this.ctx.beginPath();
                this.ctx.moveTo(anim.startX, anim.startY);
                this.ctx.lineTo(anim.currentX, anim.currentY);
                this.ctx.stroke();
                
                // Add glow
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = anim.color;
                this.ctx.stroke();
                
            } else if (anim.type === 'impact') {
                this.ctx.globalAlpha = anim.alpha;
                this.ctx.strokeStyle = anim.color;
                this.ctx.lineWidth = 3;
                
                // Draw expanding ring
                this.ctx.beginPath();
                this.ctx.arc(anim.x, anim.y, anim.currentRadius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Inner ring
                this.ctx.globalAlpha = anim.alpha * 0.5;
                this.ctx.beginPath();
                this.ctx.arc(anim.x, anim.y, anim.currentRadius * 0.7, 0, Math.PI * 2);
                this.ctx.stroke();
                
            } else if (anim.type === 'aura') {
                const pulse = Math.sin(anim.pulsePhase) * 0.2 + 0.8;
                this.ctx.globalAlpha = 0.6 * pulse;
                
                const gradient = this.ctx.createRadialGradient(
                    anim.x, anim.y, anim.radius * 0.5,
                    anim.x, anim.y, anim.radius * pulse
                );
                gradient.addColorStop(0, anim.color);
                gradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(anim.x, anim.y, anim.radius * pulse, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    // Screen effects
    createScreenFlash(color = '#ffffff', duration = 10) {
        this.screenEffects.push({
            type: 'flash',
            color: color,
            alpha: 0.8,
            duration: duration,
            progress: 0
        });
    }
    
    createScreenShake(intensity = 10, duration = 20) {
        this.screenEffects.push({
            type: 'shake',
            intensity: intensity,
            duration: duration,
            progress: 0
        });
    }
    
    createDarkenEffect(alpha = 0.5, duration = 30) {
        this.screenEffects.push({
            type: 'darken',
            alpha: alpha,
            duration: duration,
            progress: 0
        });
    }
    
    updateScreenEffects() {
        this.screenEffects = this.screenEffects.filter(effect => {
            effect.progress++;
            
            if (effect.type === 'flash') {
                effect.currentAlpha = effect.alpha * (1 - effect.progress / effect.duration);
            }
            
            return effect.progress < effect.duration;
        });
    }
    
    renderScreenEffects() {
        // Apply shake offset if active
        let shakeX = 0, shakeY = 0;
        const shakeEffect = this.screenEffects.find(e => e.type === 'shake');
        if (shakeEffect) {
            const intensity = shakeEffect.intensity * (1 - shakeEffect.progress / shakeEffect.duration);
            shakeX = (Math.random() - 0.5) * intensity;
            shakeY = (Math.random() - 0.5) * intensity;
            
            this.ctx.save();
            this.ctx.translate(shakeX, shakeY);
        }
        
        // Render other effects
        this.screenEffects.forEach(effect => {
            if (effect.type === 'flash') {
                this.ctx.save();
                this.ctx.globalAlpha = effect.currentAlpha;
                this.ctx.fillStyle = effect.color;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
                
            } else if (effect.type === 'darken') {
                this.ctx.save();
                this.ctx.globalAlpha = effect.alpha;
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
            }
        });
        
        if (shakeEffect) {
            this.ctx.restore();
        }
    }
    
    // Damage numbers
    createDamageNumber(x, y, value, type = 'normal') {
        const configs = {
            normal: { color: '#ffffff', size: 20, prefix: '' },
            critical: { color: '#ffff00', size: 28, prefix: 'CRIT! ' },
            heal: { color: '#00ff00', size: 20, prefix: '+' },
            miss: { color: '#888888', size: 18, prefix: 'MISS' },
            perfect: { color: '#ff00ff', size: 32, prefix: 'PERFECT! ' }
        };
        
        const config = configs[type] || configs.normal;
        
        this.damageNumbers.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            originalY: y,
            value: config.prefix + (type === 'miss' ? '' : value),
            color: config.color,
            size: config.size,
            alpha: 1.0,
            lifetime: 60,
            type: type,
            velocityY: -3,
            bouncePhase: 0
        });
    }
    
    updateDamageNumbers() {
        this.damageNumbers = this.damageNumbers.filter(dmg => {
            dmg.lifetime--;
            dmg.y += dmg.velocityY;
            dmg.velocityY += 0.2; // Gravity
            
            // Bounce effect for criticals
            if (dmg.type === 'critical' || dmg.type === 'perfect') {
                dmg.bouncePhase += 0.2;
                dmg.x += Math.sin(dmg.bouncePhase) * 0.5;
            }
            
            // Fade out
            if (dmg.lifetime < 20) {
                dmg.alpha = dmg.lifetime / 20;
            }
            
            return dmg.lifetime > 0;
        });
    }
    
    renderDamageNumbers() {
        this.damageNumbers.forEach(dmg => {
            this.ctx.save();
            this.ctx.globalAlpha = dmg.alpha;
            this.ctx.font = `bold ${dmg.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Outline
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 4;
            this.ctx.strokeText(dmg.value, dmg.x, dmg.y);
            
            // Fill
            this.ctx.fillStyle = dmg.color;
            this.ctx.fillText(dmg.value, dmg.x, dmg.y);
            
            // Add glow for special types
            if (dmg.type === 'critical' || dmg.type === 'perfect') {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = dmg.color;
                this.ctx.fillText(dmg.value, dmg.x, dmg.y);
            }
            
            this.ctx.restore();
        });
    }
    
    // Utility methods
    clear() {
        this.particles = [];
        this.animations = [];
        this.screenEffects = [];
        this.damageNumbers = [];
    }
    
    // Preset effect combinations
    playAttackEffect(attackerPos, targetPos, damage, isCritical = false) {
        // Slash effect
        this.createSlashEffect(
            attackerPos.x, attackerPos.y,
            targetPos.x, targetPos.y,
            isCritical ? '#ffff00' : '#ffffff'
        );
        
        // Impact at target
        setTimeout(() => {
            this.createImpactEffect(targetPos.x, targetPos.y, isCritical ? 60 : 40);
            this.createParticles(targetPos.x, targetPos.y, 'hit', isCritical ? 30 : 20);
            this.createDamageNumber(targetPos.x, targetPos.y - 30, damage, isCritical ? 'critical' : 'normal');
            
            if (isCritical) {
                this.createScreenShake(15, 20);
                this.createScreenFlash('#ffff00', 10);
            }
        }, 200);
    }
    
    playHealEffect(targetPos, amount) {
        this.createParticles(targetPos.x, targetPos.y, 'heal', 15);
        this.createAuraEffect(targetPos.x, targetPos.y, 50, '#00ff00', 30);
        this.createDamageNumber(targetPos.x, targetPos.y - 30, amount, 'heal');
    }
    
    playSkillEffect(casterPos, targetPos, skillType) {
        // Charge up at caster
        this.createAuraEffect(casterPos.x, casterPos.y, 60, '#00ffff', 40);
        this.createParticles(casterPos.x, casterPos.y, 'magic', 25);
        
        // Projectile or effect at target
        setTimeout(() => {
            if (skillType === 'damage') {
                this.createImpactEffect(targetPos.x, targetPos.y, 80, '#ff00ff');
                this.createParticles(targetPos.x, targetPos.y, 'explosion', 40);
                this.createScreenShake(20, 30);
                this.createScreenFlash('#ff00ff', 15);
            } else if (skillType === 'heal') {
                this.createAuraEffect(targetPos.x, targetPos.y, 70, '#00ff00', 50);
                this.createParticles(targetPos.x, targetPos.y, 'heal', 30);
            }
        }, 500);
    }
    
    playParryEffect(pos) {
        this.createImpactEffect(pos.x, pos.y, 100, '#00ffff');
        this.createScreenFlash('#00ffff', 5);
        this.createParticles(pos.x, pos.y, 'magic', 50);
    }
}

module.exports = VisualEffects;