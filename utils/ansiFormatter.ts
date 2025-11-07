// ANSI escape codes for text formatting
const ANSI = {
    // Text colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
    
    // Text styles
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    
    // Extended colors (8-bit)
    color256: (code: number) => `\x1b[38;5;${code}m`,
    bgColor256: (code: number) => `\x1b[48;5;${code}m`,
    
    // RGB colors (24-bit, true color)
    rgb: (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`,
    bgRgb: (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`
};

// Text color functions
export const black = (text: string) => `${ANSI.black}${text}${ANSI.reset}`;
export const red = (text: string) => `${ANSI.red}${text}${ANSI.reset}`;
export const green = (text: string) => `${ANSI.green}${text}${ANSI.reset}`;
export const yellow = (text: string) => `${ANSI.yellow}${text}${ANSI.reset}`;
export const blue = (text: string) => `${ANSI.blue}${text}${ANSI.reset}`;
export const magenta = (text: string) => `${ANSI.magenta}${text}${ANSI.reset}`;
export const cyan = (text: string) => `${ANSI.cyan}${text}${ANSI.reset}`;
export const white = (text: string) => `${ANSI.white}${text}${ANSI.reset}`;

// Background color functions
export const bgBlack = (text: string) => `${ANSI.bgBlack}${text}${ANSI.reset}`;
export const bgRed = (text: string) => `${ANSI.bgRed}${text}${ANSI.reset}`;
export const bgGreen = (text: string) => `${ANSI.bgGreen}${text}${ANSI.reset}`;
export const bgYellow = (text: string) => `${ANSI.bgYellow}${text}${ANSI.reset}`;
export const bgBlue = (text: string) => `${ANSI.bgBlue}${text}${ANSI.reset}`;
export const bgMagenta = (text: string) => `${ANSI.bgMagenta}${text}${ANSI.reset}`;
export const bgCyan = (text: string) => `${ANSI.bgCyan}${text}${ANSI.reset}`;
export const bgWhite = (text: string) => `${ANSI.bgWhite}${text}${ANSI.reset}`;

// Text style functions
export const bold = (text: string) => `${ANSI.bright}${text}${ANSI.reset}`;
export const dim = (text: string) => `${ANSI.dim}${text}${ANSI.reset}`;
export const underline = (text: string) => `${ANSI.underscore}${text}${ANSI.reset}`;
export const blink = (text: string) => `${ANSI.blink}${text}${ANSI.reset}`;
export const reverse = (text: string) => `${ANSI.reverse}${text}${ANSI.reset}`;
export const hidden = (text: string) => `${ANSI.hidden}${text}${ANSI.reset}`;

// Extended color functions
export const color256 = (code: number, text: string) => 
    `${ANSI.color256(code)}${text}${ANSI.reset}`;

export const bgColor256 = (code: number, text: string) => 
    `${ANSI.bgColor256(code)}${text}${ANSI.reset}`;

// RGB color functions
export const rgb = (r: number, g: number, b: number, text: string) => 
    `${ANSI.rgb(r, g, b)}${text}${ANSI.reset}`;

export const bgRgb = (r: number, g: number, b: number, text: string) => 
    `${ANSI.bgRgb(r, g, b)}${text}${ANSI.reset}`;

// Composable styles
export const styles = {
    error: (text: string) => bold(red(text)),
    warning: (text: string) => bold(yellow(text)),
    success: (text: string) => bold(green(text)),
    info: (text: string) => bold(blue(text)),
    highlight: (text: string) => bold(cyan(text)),
    
    // Common combinations
    errorBg: (text: string) => bgRed(white(bold(text))),
    warningBg: (text: string) => bgYellow(black(bold(text))),
    successBg: (text: string) => bgGreen(white(bold(text))),
    infoBg: (text: string) => bgBlue(white(bold(text))),
    
    // Status indicators
    status: {
        ok: (text: string) => `[${green('✓')}] ${text}`,
        error: (text: string) => `[${red('✗')}] ${text}`,
        warn: (text: string) => `[${yellow('!')}] ${text}`,
        info: (text: string) => `[${blue('i')}] ${text}`,
        success: (text: string) => `[${green('✓')}] ${text}`
    }
};

// Example usage:
/*
console.log(red('This is red text'));
console.log(bgBlue(white('White text on blue background')));
console.log(bold(green('Bold green text')));
console.log(underline(blue('Underlined blue text')));
console.log(color256(202, 'Orange text using 256 colors'));
console.log(rgb(255, 105, 180, 'Pink text using RGB'));
console.log(styles.error('Error message'));
console.log(styles.warningBg('Warning with background'));
console.log(styles.status.ok('Operation completed successfully'));
console.log(styles.status.error('An error occurred'));
*/

export default {
    // Basic colors
    black,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
    
    // Background colors
    bgBlack,
    bgRed,
    bgGreen,
    bgYellow,
    bgBlue,
    bgMagenta,
    bgCyan,
    bgWhite,
    
    // Text styles
    bold,
    dim,
    underline,
    blink,
    reverse,
    hidden,
    
    // Extended colors
    color256,
    bgColor256,
    rgb,
    bgRgb,
    
    // Predefined styles
    styles
};
