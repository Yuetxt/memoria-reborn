import floorData from "../data/floors.json"

export class Floor {
    floor: number
    sub: number

    toString() {
        return `${this.floor}-${this.sub}`
    }

    static fromString(f: string) {
        if (!f.match("\\d+-\\d+")) return
        const [floor, sub] = f.split("-")
        return new Floor(parseInt(floor), parseInt(sub))
    }

    constructor(floor: number, sub: number) {
        this.floor = floor
        this.sub = sub
        this.adapt()
    }


    next() {
        return new Floor(this.floor, this.sub + 1)
    }

    adapt() {
        if (this.floor > floorData.length) {
            this.floor = floorData.length
        }
        if (this.sub > floorData[this.floor - 1]["subs"].length) {
            if (this.floor < floorData.length) {
                this.floor += 1
                this.sub = 1
            } else {
                this.sub = floorData[this.floor - 1]["subs"].length
            }
        }
    }
}
