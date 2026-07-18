// tailwind.config.js
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
    // ... rest of your config
    theme: {
        extend: {
            fontFamily: {
                // This overrides 'font-sans' to use your Inter variable first, 
                // with default system sans-serif fonts as fallbacks.
                sans: ["var(--font-sans)", ...fontFamily.sans],
            },
        },
    },
    // ...
};