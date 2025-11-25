export const rndInt = (a, b)=> {
    return Math.floor(Math.random() * (b - a + 1)) + a
}

export const generateId = ()=> {
    return Math.random().toString(36).substring(2, 9)
}


