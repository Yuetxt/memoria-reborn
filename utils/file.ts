import fs from "fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function createMinifiedImages(
    inputDir: string,
    options = {
        quality: 80,
        maxSizeKB: 1024,  // Target max size in KB
        maxAttempts: 5   // Max optimization attempts
    }
): Promise<void> {
    try {
        const files = await fs.readdir(inputDir, {withFileTypes: true});

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

            const {name} = path.parse(file.name);
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

export async function optimizeImage(
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

export function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function normalizeDir(inputDir: string): Promise<void> {
    const files = await fs.readdir(inputDir, {withFileTypes: true});

    for (const file of files) {
        const fullPath = path.join(inputDir, file.name);

        if (file.isDirectory()) {
            const newDirName = removeAccents(file.name.toLowerCase().replace(/\s+/g, '-'));
            const newDirPath = path.join(inputDir, newDirName);

            await fs.rename(fullPath, newDirPath);
            await normalizeDir(newDirPath);
            continue;
        }

        const newFileName = removeAccents(file.name.toLowerCase().replace(/\s+/g, '-'));
        const newFilePath = path.join(inputDir, newFileName);

        await fs.rename(fullPath, newFilePath);
    }
}