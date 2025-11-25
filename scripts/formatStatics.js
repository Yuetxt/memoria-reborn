import {staticDir} from "../config.json"
import {createMinifiedImages, normalizeDir} from "../utils/file";

(async () => {
    await normalizeDir(`${process.cwd()}/${staticDir}`)
    await createMinifiedImages(`${process.cwd()}/${staticDir}`)
})()