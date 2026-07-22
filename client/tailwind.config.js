/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nissan: {
                    red: '#C3002F',
                    dark: '#111111',
                    gray: '#2D2D2D',
                }
            },
            fontFamily: {
                sans: ['Kanit', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
