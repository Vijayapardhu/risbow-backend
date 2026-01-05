"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: "#0F172A",
                    accent: "#4F46E5",
                    soft: "#EEF2FF"
                }
            }
        }
    },
    plugins: []
};
exports.default = config;
//# sourceMappingURL=tailwind.config.js.map