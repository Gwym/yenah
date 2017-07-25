// convert imports and exports from module:'commonjs' to default in server/shared for direct use in webapp/shared.gen.ts

// TODO (4) : make out files readonly ?
// TODO (5) : epigenetics.ts as "configuration" file

import * as fs from "fs";
import * as path from "path";

let outFilename = './frontend/js/shared.gen.ts';

let inFiles = [
    './src/yenah/shared/action.ts', // Action must be before concept (defines the concept of Actions)
    './src/yenah/shared/concept.ts',
    './src/services/shared/messaging.ts',
    './src/yenah/shared/messaging.ts']; 
// 'persistor', 'tests' // TODO (0) : separate client, server and shared tests and persistence

var outContent = '// WARNING : GENERATED FILE, DO NOT MODIFY (modify server shared files ' + "\n"
    + '// and run node build/epigen/gen_shared_frontend.js from project root directory' + "\n\n";

for (let inFile of inFiles) {

    let inFilename = path.normalize(inFile);
    let inContent = fs.readFileSync(inFilename, 'utf8');
    inContent = inContent.replace(/export /g, '') + "\n\n";
    // FIXME (0) : add use of "" instaed of '' ;  final code line ';'
    inContent = inContent.replace(/import {[^}]*} from '([^']*)'/g, "// import '$1'");

    outContent += "\n// " + inFilename + "\n" + inContent ;
    
    console.log('Read ' + path.resolve(inFilename));
}

fs.writeFileSync(outFilename, outContent, 'utf8'); 

console.log('Wrote ' + path.resolve(outFilename)); 




