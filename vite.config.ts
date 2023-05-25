const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/main.ts'),
            name: 'mapPro',
            fileName: (format) => `mapPro.${format}.js`
        }
    },
})

