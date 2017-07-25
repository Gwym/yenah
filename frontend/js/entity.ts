



// class Entity3DRenderer : Entity 3D graphical warpper 
class Entity3D extends THREE.Mesh {



	/*	display3D(tile: Tile) {
	
			var modelFileName = this.getModelUrl();
	
			console.log('Entity3D > loading ' + modelFileName);
	
			G_store.getModel(modelFileName, (model: Entity3D) => {
	
				let scale = 8; // TODO : (3) scale = f(age)
	
				model.scale.set(scale, scale, scale);
				model.position.set(tile.cell.relX * Tile.SIZE, -model.geometry.boundingBox.min.y * scale, tile.cell.relY * Tile.SIZE);
	
				tile.scene.addEntity(model);
	
				G_engine.renderOnce();
			});
		} */

	/*getModelUrl(): string {
		return 'model/slug.json';

	}*/

	/* getModelName() {

		var model: string, move: string;

		// résolution de l'affichage des agents selon les caractéristiques
		// c'est la plus haute caractéristique qui l'emporte
		if (!this.move_earth && !this.move_water && !this.move_air) {// plant
			model = 'plant';
		} else {
			model = 'creature';

			if (this.move_earth > this.move_water
				&& this.move_earth > this.move_air) {
				move = 'earth' + this.move_earth;
			} else if (this.move_water > this.move_earth
				&& this.move_water > this.move_air) {
				move = 'water' + this.move_water;
			} else {
				move = 'air' + this.move_air;
			}
		}

		return model; // TODO (2) : move models;
	}; */
}

/*
class RelEntity {

	// iid: number
	_id: string
	updateDH: number | undefined

	relX: number
	relY: number
	inventory: RelEntity[] = []

	condMax: number
	condSlope: number
	private cond: number
	private condDH : number

		

	static Factory(entityGist: EntityGist): RelEntity {

		// TODO : (3) Entity (indeterminate) = f(actor visibility)

		let entityConstructor = World.entityConstructor[entityGist.entId];

		if (!entityConstructor) {
			entityConstructor = RelEntity;
		}

		return new entityConstructor(entityGist);
	}

	// !!! ~ private constructor for 'abstract' Entity, use only to create indeterminate Entity !!!
	constructor(entityGist: EntityGist) {

		if (typeof entityGist.condDH !== 'number' ) {
			dbg.error('Entity unsync condDH');
			entityGist.condDH = 0;
		}

		this._id = entityGist._id;
		this.relX = entityGist.relX;
		this.relY = entityGist.relY;
		this.condMax = entityGist.condMax !== undefined ? entityGist.condMax : Defaultz.COND_MAX;
		this.cond = entityGist.cond !== undefined ? entityGist.cond : 0;
		this.condSlope = entityGist.condSlope !== undefined ? entityGist.condSlope : Defaultz.COND_SLOPE;
		this.condDH = entityGist.condDH;
	}

	getCond(now: number) {

		var limit_val,
			real_val = this.cond,
			a_dh = this.condDH,
			a_max = this.condMax,
			a_slope = this.condSlope;

		if (a_dh > now) {
			dbg.warn('Entity.getCond > Wrong dh : now ' + now + ' > ' + a_dh + ' in ' + this._id);
			a_dh = now;
			this.condDH = now; // TODO (1) : set ?
		}

		if (a_slope != 0) {
			//real_val = (global.cst.SLOPE_BASE / a_slope) * (ctx.now - a_dh) + real_val;
			real_val += (1. / a_slope * Defaultz.SLOPE_BASE) * (now - a_dh);
		}
		limit_val = Math.min(a_max, real_val);

		dbg.attr('Entity.getCond:' + limit_val
			+ ' (max:' + a_max
			+ ' dh:' + Utilz.t2d(a_dh)
			+ ' now:' + Utilz.t2d(now)
			+ ' detaT:' + (now - a_dh)
			+ ' val: ' + this.cond + ' slope: ' + a_slope
			+ ' real: ' + real_val + ') from '
			+ this._id
		);

		return limit_val;
	}

	setCond(v: number, now: number) {

		// Stabilize attribute

		this.condDH = now;
		this.cond = v;

		// dbg.attr(toStr(this) + ' setCond : ' + this.getAttribute(a, ctx) + ' => ' + v + ' dh:' + dbg.t2d(ctx.now * 1000) + ' old_val: ' + this.get(a), ')');
	}

	pushEntity(entity: RelEntity) {
		this.inventory.push(entity);
	}

	// get distance to actor
	getD2A() {
		return Math.round(Math.sqrt(this.relX * this.relX + this.relY * this.relY));
	}

	getWeight() {
		return this.condMax;
	}
*/



	/* arrayMapping : {
			jid : 0,
			iid : 0,
			//cid : 0,
			//acts : 0,
			xe_conds: {
				x_cond: {cond_max:0, cond:0, cond_slope:0} 
			},
			xe_characs : {
				// entity
				solidity_cut : 0, // Résistance tranchante/perçante (% de
				// dommages effectivement affectés)
				solidity_blunt : 0, // Résistance contondante
				solidity_acid : 0, // Résistance
				solidity_fire : 0, // Résistance
				solidity_cold : 0, // Résistance au froid (ambiant) => etat
				// frigorifié. Ne concerne pas les matières.
				passive_retort_cut : 0, // Effet passif au contact
				passive_retort_acid : 0, // Effet passif au contact
				passive_retort_elec : 0, // Effet passif au contact
				passive_retort_fire : 0, // Effet passif au contact
				gist_poisoned : 0
			// Empoisonné à la consommation
			},
			xe_states : 0,
			xe_pos : {
				ctn_iid : 0,
				ctn_slot : 0
			},
			visibility : 0,
			 xe_gist : {
				// entity
				weigth : 0,
				color : 0, // Couleur de base (modificateur de visibilité)
				worth : 0, // Valeur approximative globale (danger pour un
				// agent)
				capacity : 0
			// Capacité pour un contenant, portage auto pour un
			// agent (hors préhension)
			}
		}*/
	/*
		onchange(zone) {
	
			console.log('entity.onchange > ' + this.viewAsString() + ' container:' + this.$container);
			
			this.update_dh =  zone.update_dh;
			zone.registerEntity(this);
			
			this.acts = [ActAttack.cid];
			
			// get upper Cell Container
			var cc = this.getContainer();
			while (cc.getContainer) {
				cc = cc.getContainer();
			}
	
			this.rel_x = cc.rel_x;
			this.rel_y = cc.rel_y;
	
			// default : display on map if directly in upper cell
			this.initView();
	
			if (cc === this.getContainer()) {
				
				this.$map = $('<div/>').addClass('c0') // + this.cid, // default fallback by css
					// .data('gfx', 'g/c' + this.cid + '.png')
					.appendTo(zone.panorama_canvas);
				this.viewSprite(this.$map, this, 'viewMap_16', 
						((this.theta + 2 * zone.direction) % 8)	// offset
				);	
				
				this.viewMapIso(zone);
			} else {
				console.log('entity.onchange > Not displayed on map (in relative container)');
			}
		}
		getContainer() {
			
			// var container = yh.get(this.ctn_iid);
	
			if (!this.$container) {
				console.warn('entity.getContainer > No container for ' + this + ' container:' + this.$container);
			}
			
		//	console.log('c16.getContainer > Container for ' + this.container.toStr());
	
	
			return this.$container;
		}
		putfunction(o) {
			console.log('c16.put > inventory[' + o.iid + '] = ' + o.toStr());
			this.inventory[o.iid] = o;
		}
		remove(iid) {
			console.log('c16.put > Remove from inventory[' + iid + '] : ' + this.inventory[iid].toStr());
	
			delete this.inventory[iid];
		}
		// getAttribute : get a dynamic attribute (cond, energy, qt, mana...)
		getAttribute(attr) {
	
			var d = new Date();
			var delta_dh = Math.round(d.getTime()/1000) - this.update_dh;
	
			var v = this[attr]; 
			
			if (this[attr + '_slope'] != 0) { 
				v = Math.round((1. / this[attr + '_slope']  ) * delta_dh + v);  //  * getConstant('SLOPE_BASE') 
			}
			
		
	
			// TODO (5) : trigger on cond = 0 ? (reload data !)
			return Math.min(this[attr + '_max'], v);
		}
	
		// get distance to actor
		getD2A() {
			return Math.round(Math.sqrt(this.rel_x * this.rel_x + this.rel_y * this.rel_y));
		}
	
		// get angle (quadrant) for actor
		getA4A() {
			// radian to direction (0 -> 7)
			// Math.atan2(delta x, delta y), assuming actor is ALWAYS at zone center (0,0)
			
			var theta = 8 * Math.atan2(this.rel_x, this.rel_y) / Math.PI;
			if (theta < 0)
				theta = 16 + theta;
			if (theta > 15)
				theta = 0;
			return Math.floor(theta/2);
		}
		
		initView() {
			console.log('Entity.initView > TODO : Preload image or 3D photomathon ?');
		}
		// view string
		viewAsString(c?: HTMLElement) {
			if (!c) {
				return 'c16.toStr() > ' + ' jid:' + this.jid + ' gid:' + this.iid + ' gfx_base:' + this.gfx_base + ' ctn:'
						+ this.cnt_iid + ', ' + this.ctn_slot
						+ (this.rel_x !== undefined ? '(' + this.rel_x + ',' + this.rel_y + ')' : ' no pos');
				// JSON.stringify(this.d);
			}
			c.appendChild(document.createTextNode(JSON.stringify(this.d)));
		}
	
	
		// view map, second part : place iso coord (i.e. view dependent)
		// h: html container (i.e. this.map_h)
		// g: zone definition
		viewMapIso (zone) {
	
			// default, North (4) is pointing in up/rigth direction
	
			
	
			var h = this.map_h;
			var offset = ((this.theta + 2 * zone.direction) % 8);
	
			f2i(h, zone, this.rel_x, this.rel_y);
	
			h.css({
				left : h.x + 'px',
				top : h.y - 35 + 'px'
			});
			
			var e = this;
				
		//	console.log('viewMapIso >' + ' b:' + e.bg_head + ' t:' + e.bg_torso + ' h:' + e.bg_body + ' o (' + offset + ') :'
		//				+ e.offsets[offset]);
			
			var $kids = h.children();
			$kids.eq(0).css('background', e.bg_body + e.offsets[offset]);
			$kids.eq(1).css('background', e.bg_torso + e.offsets[offset]);
			$kids.eq(2).css('background', e.bg_head + e.offsets[offset]);
	
		
		}
		
		viewAttribute(h, attr) {
	
			var val;
	
			console.log('Entity.viewAttribute > ' + attr);
	
			if (this[attr + "_max"] > 0) {
				val = this.getAttribute(attr);
				$('<li/>').addClass('vc_' + attr).attr('title', YENAH.spf(yt.conds_titles[attr], {
					v : val,
					m : this[attr + "_max"],
					s : this[attr + "_slope"]
				})).text('[' + yt.conds_lite[attr] + ':' + val + '/' +  this[attr + "_max"] + '@' + this[attr + "_slope"] + ']').appendTo(h);
			}
		}
		
		viewInCard(h, zone) {
	
			console.log('Entity.viewInCard > html container ' + (h.id ? ' id:' + h.id : h)
					+ this.xe_pos);
	
			var u = $('<div/>').addClass('ent_card').appendTo(h);
			var t = 4; // TODO : pseudoRand(seed, [1,4,6,7]);
	
			var icon = $('<div/>').addClass('icon').appendTo(u);
	
			this.viewSprite(icon, this, 'v_icon', t);
	
			this.viewIdentity(u, this);
			$('<div/>').text(yt.orientation + (yt.theta[this.theta])).appendTo(u);
			this.viewActions(u, this, zone);
			this.viewAttribute(u, this, 'cond');
			this.viewAttribute(u, this, 'qt');
			this.viewAttribute(u, this, 'energy');
			this.viewAttribute(u, this, 'mana');
			this.viewCharacs(u, this);
			
			return u; // TODO : special for memory
		}
		viewAsTarget(h) {
			// console.log('c16.viewAsTarget > ' + h);
			this.viewSprite(h, this, 'in_br', getConstant('SPRITE_LARGE'));
		} */

//}


