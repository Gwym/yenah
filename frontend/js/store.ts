

// TODO (5) : Store<T> 

interface Entity3DCallback { (model: Entity3D): void }
/* interface Entity3DCallbackList {
    [index: number]: Entity3DCallback
    length: number
    push: (cb: Entity3DCallback) => void
}*/
type Entity3DCallbackList = Entity3DCallback[]
interface Entity3DCallbackDictionary { [index: string]: Entity3DCallbackList | undefined }

class Store {

    private modelStock: { [index: string]: Entity3D | null } = {} // Entity3DDictionary
    private modelCallbackLists: Entity3DCallbackDictionary = {}
    private textureStock: { [index: string]: THREE.Texture | null } = {} // TextureDictionary

    /* preLoadModels() {
        Promise.all([p1, p2, p3, p4, p5]).then(values => { 
      console.log(values);
    }, reason => {
      console.log(reason)
    });
    } */

    // callback: function ( geometry, materials )
    getModel(url: string, callback: Entity3DCallback): void {

        console.log('getModel ' + url);

        if (this.modelStock[url] instanceof Entity3D) {
            console.log('Store > cache hit ' + url);
            callback((<Entity3D>this.modelStock[url]).clone());
            return;
        }
        else {
            if (!this.modelCallbackLists[url]) {

                this.modelCallbackLists[url] = [];
                (<Entity3DCallbackList>(this.modelCallbackLists[url])).push(callback);

                new Promise<Entity3D>((resolve, _reject) => {

                    let jsonLoader = new THREE.JSONLoader();
                    jsonLoader.load(url, (geometry, materials) => {
                        console.log('Loader model  > ' + url);
                        this.modelStock[url] = this.createEntity3D(geometry, materials); // FIXME : resolve(geo, mat) and then createEntity
                        resolve(<Entity3D>this.modelStock[url]);
                    })
                }).then((entity: Entity3D) => {

                  //  this.modelStock[url] = entity;

                    let callbacks = this.modelCallbackLists[url];

                    if (callbacks !== undefined && callbacks.length > 0) {

                        console.log('Store model callback > ' + url + ' serving:' + callbacks.length);

                        for (let i = 0; i < callbacks.length; i++) {
                            callbacks[i](entity.clone());
                        }

                        delete this.modelCallbackLists[url]
                        this.modelCallbackLists[url] = undefined;
                    }
                    else {
                        console.error('Store > No callback for ' + url);
                    }
                }, (reason) => {
                    console.error(reason);
                });
            }
            else {
                (<Entity3DCallbackList>(this.modelCallbackLists[url])).push(callback);
                console.log('Store > loads pending ' + url + ' count:' + (<Entity3DCallbackList>(this.modelCallbackLists[url])).length);
            }
        }
    }

    createEntity3D(geometry: THREE.Geometry, materials: THREE.Material[]): Entity3D {

        // console.info({symbol: 'YENAH.Tile.addAgentToTile', geometry:geometry, materials:materials });

        if (!materials) {
            console.error('No material ' + materials);
            materials = []
            materials.push(new THREE.MeshLambertMaterial())
        }
       // else { material = new THREE.MeshFaceMaterial(materials); }
        // var geo = geometry.clone();
        // var modifier = new THREE.SubdivisionModifier( 1 );
        // modifier.modify( smooth );

        var entity = new Entity3D(geometry, materials);
        // entity.scale.set(10, 10, 10);
        entity.rotateX(Math.PI / 2); // FIXME ?!
        //   entity.position.z += 50;
        entity.geometry.computeBoundingBox();

        return entity;
    }

    getTexture(url: string): THREE.Texture {

        // TODO (1) : texture from config, keep textures langage dependent or not ? (eg. signs, texts....)

        let texture: THREE.Texture;

        if (this.textureStock[url] instanceof THREE.Texture) {
            texture = <THREE.Texture>this.textureStock[url];
        }
        else {
            let image = new Image();
            texture = new THREE.Texture(image);
            this.textureStock[url] = texture;

            new Promise<THREE.Texture>((resolve, reject) => {

                image.onload = function () { resolve(texture) };
                image.onerror = function (err) { reject(err); console.error('Failed to load ' + url + ' ' + err); };
                image.src = url;
            }).then((tex: THREE.Texture) => {

                tex.needsUpdate = true;
                G_engine.renderOnce();
                
            }, (reason) => {
                console.error(reason);
            });
        }
        return texture;
    }
}
