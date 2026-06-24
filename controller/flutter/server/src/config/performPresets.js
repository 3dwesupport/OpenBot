'use strict';

const PRESETS = {
    movement: {
        baseSeconds: 7.2,
        steps: [
            { action: 'drive', r: 1.0, l: 1.0, seconds: 1.0 },
            { action: 'drive', r: 1.0, l: 0.71, seconds: 0.8 },
            { action: 'drive', r: 0.71, l: 1.0, seconds: 0.8 },
            { action: 'drive', r: 1.0, l: 0.625, seconds: 1.0 },
            { action: 'drive', r: 0.625, l: 1.0, seconds: 1.0 },
            { action: 'stop', seconds: 0 },
            { action: 'drive', r: -1.0, l: -1.0, seconds: 1.0 },
            { action: 'stop', seconds: 0 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.8 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.8 },
            { action: 'stop' },
        ],
    },

    lights: {
        baseSeconds: 3.4,
        steps: [
            { action: 'lights', percent: 25, seconds: 0.3 },
            { action: 'lights', percent: 50, seconds: 0.3 },
            { action: 'lights', percent: 75, seconds: 0.3 },
            { action: 'lights', percent: 100, seconds: 0.3 },
            { action: 'lights', percent: 0, seconds: 0.2 },
            { action: 'lights', percent: 100, seconds: 0.2 },
            { action: 'lights', percent: 0, seconds: 0.2 },
            { action: 'lights', percent: 100, seconds: 0.2 },
            { action: 'lights', percent: 25, seconds: 0.2 },
            { action: 'lights', percent: 50, seconds: 0.2 },
            { action: 'lights', percent: 75, seconds: 0.2 },
            { action: 'lights', percent: 100, seconds: 0.2 },
            { action: 'lights', percent: 75, seconds: 0.2 },
            { action: 'lights', percent: 50, seconds: 0.2 },
            { action: 'lights', percent: 25, seconds: 0.2 },
            { action: 'lights', percent: 0, seconds: 0.2 },
        ],
    },

    indicators: {
        baseSeconds: 3.0,
        steps: [
            { action: 'indicator', side: 'left', seconds: 0.3 },
            { action: 'indicator', side: 'stop', seconds: 0.2 },
            { action: 'indicator', side: 'right', seconds: 0.3 },
            { action: 'indicator', side: 'stop', seconds: 0.2 },
            { action: 'indicator', side: 'left', seconds: 0.2 },
            { action: 'indicator', side: 'right', seconds: 0.2 },
            { action: 'indicator', side: 'left', seconds: 0.2 },
            { action: 'indicator', side: 'right', seconds: 0.2 },
            { action: 'indicator', side: 'left', seconds: 0.2 },
            { action: 'indicator', side: 'left', seconds: 0.2 },
            { action: 'indicator', side: 'left', seconds: 0.2 },
            { action: 'indicator', side: 'right', seconds: 0.2 },
            { action: 'indicator', side: 'right', seconds: 0.2 },
            { action: 'indicator', side: 'right', seconds: 0.2 },
            { action: 'indicator', side: 'stop', seconds: 0.2 },
        ],
    },

    movement_indicators: {
        baseSeconds: 6.0,
        steps: [
            { action: 'drive', r: 1.0, l: 1.0, seconds: 1.0 },
            { action: 'stop', seconds: 0.05 },
            { action: 'indicator', side: 'left', seconds: 0.3 },
            { action: 'drive', r: 1.0, l: 0.71, seconds: 1.0 },
            { action: 'stop', seconds: 0.05 },
            { action: 'indicator', side: 'left', seconds: 0.3 },
            { action: 'drive', r: 0.625, l: 1.0, seconds: 1.0 },
            { action: 'stop', seconds: 0.05 },
            { action: 'indicator', side: 'right', seconds: 0.3 },
            { action: 'indicator', side: 'stop', seconds: 0.2 },
            { action: 'stop' },
        ],
    },

    all: {
        baseSeconds: 8.6,
        steps: [
            { action: 'lights', percent: 100, seconds: 0.3 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.8 },
            { action: 'indicator', side: 'left', seconds: 0.3 },
            { action: 'drive', r: 1.0, l: 0.71, seconds: 0.8 },
            { action: 'lights', percent: 50, seconds: 0.3 },
            { action: 'drive', r: 0.71, l: 1.0, seconds: 0.8 },
            { action: 'indicator', side: 'right', seconds: 0.3 },
            { action: 'drive', r: 1.0, l: 0.625, seconds: 0.8 },
            { action: 'drive', r: 0.625, l: 1.0, seconds: 0.8 },
            { action: 'stop', seconds: 0 },
            { action: 'drive', r: -1.0, l: -1.0, seconds: 0.8 },
            { action: 'stop', seconds: 0 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.8 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.8 },
            { action: 'lights', percent: 25, seconds: 0.3 },
            { action: 'lights', percent: 75, seconds: 0.3 },
            { action: 'lights', percent: 100, seconds: 0.3 },
            { action: 'indicator', side: 'left', seconds: 0.3 },
            { action: 'indicator', side: 'right', seconds: 0.3 },
            { action: 'indicator', side: 'stop', seconds: 0.3 },
            { action: 'lights', percent: 0, seconds: 0.2 },
            { action: 'stop' },
        ],
    },

    zigzag: {
        baseSeconds: 4.0,
        steps: [
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.215 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.215 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.215 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.215 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.215 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.215 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.215 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.285 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.215 },
            { action: 'stop' },
        ],
    },

    g_turn: {
        baseSeconds: 1.0,
        steps: [
            { action: 'drive', r: 1.0, l: -1.0, seconds: 1.0 },
            { action: 'stop' },
        ],
    },

    letter_L: {
        baseSeconds: 3.0,
        steps: [
            { action: 'drive', r: 1.0, l: 1.0, seconds: 1.3 },
            { action: 'stop', seconds: 0.15 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.35 },
            { action: 'stop', seconds: 0.1 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.7 },
            { action: 'stop' },
        ],
    },

    letter_I: {
        baseSeconds: 2.0,
        steps: [
            { action: 'drive', r: 1.0, l: 1.0, seconds: 2.0 },
            { action: 'stop' },
        ],
    },

    letter_T: {
        baseSeconds: 3.45,
        steps: [
            { action: 'drive', r: 1.0, l: 1.0, seconds: 1.0 },
            { action: 'stop', seconds: 0.15 },
            { action: 'drive', r: -1.0, l: -1.0, seconds: 0.7 },
            { action: 'stop', seconds: 0.1 },
            { action: 'drive', r: 1.0, l: -1.0, seconds: 0.30 },
            { action: 'stop', seconds: 0.1 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 1.0 },
            { action: 'stop' },
        ],
    },

    letter_O: {
        baseSeconds: 1,
        steps: [
            { action: 'drive', r: 1.0, l: -1.0, seconds:1 },
            { action: 'stop' },
        ],
    },

    letter_P: {
        baseSeconds: 3.6,
        steps: [
            { action: 'drive', r: 1.0, l: 1.0, seconds: 1.15 },
            { action: 'stop', seconds: 0.08 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.30 },
            { action: 'stop', seconds: 0.08 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.44 },
            { action: 'stop', seconds: 0.08 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.30 },
            { action: 'stop', seconds: 0.08 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.44 },
            { action: 'stop', seconds: 0.08 },
            { action: 'drive', r: -1.0, l: 1.0, seconds: 0.30 },
            { action: 'stop', seconds: 0.08 },
            { action: 'drive', r: 1.0, l: 1.0, seconds: 0.44 },
            { action: 'stop' },
        ],
    },
};

const PERFORM_INSTRUCTIONS = `
perform(preset, duration?, multiplier?) — whitelist only. Default for all other speech is drive/stop/lights/indicator/routine.

When NEVER to use perform()
- turn, forward, backward, circle, go, move, stop, headlights, blinkers
- "spin left/right", "perform spin", "spin movement" → drive(), NOT perform
- "perform movement" (without "random") → drive(), NOT perform
- Exception: "G turn" / "G-turn" (Mercedes tank spin) → perform(g_turn), NOT generic spin routing
- If speech does not match a row in the whitelist below → drive/stop/lights/indicator/routine

Preset whitelist (must match keywords)
| preset | User must say |
| movement | "random movement" OR "move randomly" |
| lights | "random lights" OR "light show" |
| indicators | "random indicators" OR "random blinkers" |
| movement_indicators | "random movement with indicators" |
| all | "party" OR "disco" OR "dance" OR "perform random" OR "random party" |
| zigzag | "zigzag" OR "zig zag" |
| g_turn | "G turn" OR "G-turn" OR "do a G turn" OR "Mercedes G turn" |
| letter_L | (draw|make|write|letter|shape) + "L" |
| letter_I | (draw|make|write|letter|shape) + "I" |
| letter_T | (draw|make|write|letter|shape) + "T" |
| letter_O | (draw|make|write|letter|shape) + "O" |
| letter_P | (draw|make|write|letter|shape) + "P" |

Preset reference (timing only — do not use to pick tool)
- movement — random mix; default 8s
- lights / indicators / movement_indicators / all — random shows; default 8s
- zigzag — stair zigzag; ~4s at M
- g_turn — Mercedes-style tank spin in place (r=1, l=-1); ~1s at M (~360°)
- letter_L ~3s | letter_I ~2s | letter_T ~3.5s | letter_O ~1s | letter_P ~3.6s at M

Modifiers (only after whitelist match)
- "for N seconds" → duration=N
- slow/gentle → S; fast/quick → F; else M
- Letters, g_turn & zigzag: scale by multiplier if no duration
- G turn right → drive(r=-1.0, l=1.0), not g_turn preset
`.trim();

const SHAPE_PRESETS = new Set(['g_turn', 'letter_L', 'letter_I', 'letter_T', 'letter_O', 'letter_P', 'zigzag']);
const SPEED_TIME_SCALE = { S: 1.5, M: 1.0, F: 0.7 };

function buildRoutineFromPreset({ preset, duration, multiplier = 'M' }) {
    const def = PRESETS[preset];
    if (!def) return null;

    const m = ['S', 'M', 'F'].includes(multiplier) ? multiplier : 'M';
    let factor;

    if (SHAPE_PRESETS.has(preset)) {
        if (typeof duration === 'number' && duration > 0) {
            factor = duration / def.baseSeconds;
        } else {
            factor = SPEED_TIME_SCALE[m] ?? 1;
        }
    } else {
        const dur = typeof duration === 'number' && duration > 0 ? duration : 8;
        factor = dur / def.baseSeconds;
    }

    const steps = def.steps.map((step) => {
        const out = { ...step };
        if (typeof out.seconds === 'number') {
            out.seconds = Math.max(0.05, Math.round(out.seconds * factor * 100) / 100);
        }
        if (out.action === 'drive') {
            out.multiplier = m;
        }
        return out;
    });

    return { action: 'routine', steps };
}

module.exports = {
    PRESETS,
    PERFORM_INSTRUCTIONS,
    buildRoutineFromPreset,
};
