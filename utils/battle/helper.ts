import {Element, ELEMENT_TABLE_STRONG, ELEMENT_TABLE_WEAK} from "../types/battle";

export function elementRelationship(e1: Element, e2: Element) {
    // 0 is neutral
    // 1 is strong
    // -1 is weak
    if(e1 == e2) {
        return 0
    }
    if(ELEMENT_TABLE_STRONG[e1] == e2) {
        return 1
    }
    if(ELEMENT_TABLE_WEAK[e1] == e2) {
        return -1
    }
    return 0
}