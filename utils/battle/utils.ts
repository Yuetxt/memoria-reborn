import {AttachmentBuilder} from "discord.js";
import * as path from "node:path";

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
    return showPercent ? `${bar} ${p}%` : bar;
}

export function chance(percent: number) {
    return Math.random() < percent / 100
}

export function createAttachment(p) {
    const attachment = new AttachmentBuilder(path.join(process.cwd(), p))
    console.log(attachment, `attachment://${p.split("/").pop()}`)
    return `attachment://${p.split("/").pop()}`
}
import fs from 'fs/promises';
import sharp from 'sharp';

export async function createMinifiedImages(
    inputDir: string,
    options = {
        quality: 80,
        maxSizeKB: 250,  // Target max size in KB
        maxAttempts: 5   // Max optimization attempts
    }
): Promise<void> {
    try {
        const files = await fs.readdir(inputDir, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(inputDir, file.name);

            if (file.isDirectory()) {
                // Recursively process subdirectories
                await createMinifiedImages(fullPath, options);
                continue;
            }

            // Skip non-image files and already minified files
            const ext = path.extname(file.name).toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            if (!imageExtensions.includes(ext) || file.name.includes('-min')) {
                continue;
            }

            const { name } = path.parse(file.name);
            const outputPath = path.join(inputDir, `${name}-min${ext}`);

            // Skip if minified version already exists and is smaller than original
            try {
                const [origStats, minStats] = await Promise.all([
                    fs.stat(fullPath),
                    fs.stat(outputPath).catch(() => null)
                ]);

                if (minStats && minStats.size <= origStats.size) {
                    console.log(`Skipping ${file.name} - minified version already exists and is smaller`);
                    continue;
                }
            } catch (e) {
                // If we can't access either file, just continue
            }

            await optimizeImage(fullPath, outputPath, options);
        }
    } catch (error) {
        console.error(`Error processing directory ${inputDir}:`, error);
        throw error;
    }
}

async function optimizeImage(
    inputPath: string,
    outputPath: string,
    options: { quality: number; maxSizeKB: number; maxAttempts: number }
): Promise<void> {
    try {
        const inputStats = await fs.stat(inputPath);
        const inputSizeKB = inputStats.size / 1024;

        if (inputSizeKB <= options.maxSizeKB) {
            console.log(`Skipping ${path.basename(inputPath)} - already under ${options.maxSizeKB}KB`);
            return;
        }

        console.log(`Optimizing ${path.basename(inputPath)} (${inputSizeKB.toFixed(2)}KB)`);

        let quality = options.quality;
        let outputSizeKB = inputSizeKB;
        let attempt = 0;

        // Try to reduce size while maintaining quality
        while (outputSizeKB > options.maxSizeKB && attempt < options.maxAttempts) {
            await sharp(inputPath)
                .jpeg({
                    quality,
                    mozjpeg: true,
                    progressive: true
                })
                .toFile(outputPath);

            const outputStats = await fs.stat(outputPath);
            outputSizeKB = outputStats.size / 1024;

            console.log(`  Attempt ${attempt + 1}: Quality ${quality}% -> ${outputSizeKB.toFixed(2)}KB`);

            if (outputSizeKB > options.maxSizeKB) {
                quality -= 10; // Reduce quality more aggressively
                attempt++;
            }
        }

        if (outputSizeKB <= options.maxSizeKB) {
            console.log(`✅ Success: ${path.basename(outputPath)} (${outputSizeKB.toFixed(2)}KB)`);
        } else {
            console.log(`⚠️  Could not reduce ${path.basename(inputPath)} below ${options.maxSizeKB}KB (best: ${outputSizeKB.toFixed(2)}KB)`);
        }
    } catch (error) {
        console.error(`Error optimizing ${path.basename(inputPath)}:`, error);
        throw error;
    }
}