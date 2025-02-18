import { defineConfig }         from 'vite'
// import path                     from "path";
// import { fileURLToPath }        from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export default defineConfig(({ command, mode, ssrBuild }) => {
    switch( command ){
        case 'serve': return {
            base      : './',
            plugins   : [],
            server    : {
                hmr         : true,
                host        : 'localhost',
                port        : 3022,
                open        : '/client/index.htm',
                strictPort  : true,
                watch       : { usePolling: true },
            },

            resolve:{
                alias:{ 
                    // '@oito/ray'     : './packages/ray/src/index.ts', 
                    // '@oito/oop'     : './packages/oop/src/index.ts',
                    // '@oito/curves'  : './packages/curves/src/index.ts'
                },
            }
        };
        
        case 'build': return{

        };
    }
});