# yenah

(fr)

Projet de "jeu de la vie" en ligne (simulation d'évolution)

Site Web : http://yenah.net

(en)

Project of online "Webgame of life" (simulation of evolution)

Website : http://yenah.net

# building

Prerequisite for building
=========================

Typescript (see http://www.typescriptlang.org/)
Typings for node, mongodb, es6-promise and ws in ./server/typings (see https://www.npmjs.com/package/typings or https://github.com/typings/typings) 
Optional : Visual Studio Code EDI (https://code.visualstudio.com/docs/languages/typescript)

Download or fetch project form Github, install dependencies for server side :
```
npm install
```

Server building :
==========================

With Visual Studio Code
-----------------------

Open the root folder (containing the server side tsconfig.json), hit Ctrl-Maj-B to compile, run or debug.

With command line
-----------------

Go to the root folder (containing the server side tsconfig.json) and compile

```
tsc -p
```

Client Webapp building :
=================

With Visual Studio Code
-----------------------

Open the /webapp folder (containing the client side tsconfig.json), hit Ctrl-Maj-B to compile. 

With command line
-----------------

Go to the /webapp folder (containing the client side tsconfig.json) and type

```
tsc -p
```

