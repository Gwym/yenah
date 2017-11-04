"use strict"

interface spfmPattern {
	(...a: any[]): string;
}

// TODO (4) : Check data coherency (texts added afterward)
// TODO (5) : check pattern validity on creating spfPattern
// spf : string pattern factory. See http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
// multiple
let spfm = function (pattern: string): spfmPattern {
	return function (...args: any[]) {
		return pattern.replace(/{(\d+)}/g, function (match, number) {
			return typeof args[number] !== 'undefined' ? args[number] : '(?)';
		});
	}
}

interface spf2Pattern {
	(v: number, m: number): string;
}

// value / maxValue pattern
let spf2 = function (pattern: string): spf2Pattern {
	return function (v: number, m: number) {
		return pattern.replace(/{(\d+)}/g, function (match, number) {
			return number == 0 ? String(v) : String(m);
		});
	}
}

interface spf3Pattern {
	(v: number, m: number, r: number): string;
}

// value / maxValue / regain pattern
let spf3 = function (pattern: string): spf3Pattern {
	return function (v: number, m: number, r: number) {
		return pattern.replace(/{(\d+)}/g, function (match, number) {
			if (number == 0) return String(v)
			else if (number == 1) return String(m)
			else return String(r);
		});
	}
}

module I18n {
	export interface Corpus {
		global_error: string
		, welcome_name: spfmPattern
		, welcome_no_agent_html: string // HtmlString
		, welcome_name_short: ['Bienvenue § !', { n: 0 }]
		, disconnected: string
		, beforeunload: string
		, cancel: string
		, close: string
		, options: string
		, conds: ['constitution', 'temps', 'énergie', 'mana']
		, conds_lite: { cond: 'C', qt: 'T', energy: 'E', mana: 'M' }
		, conds_titles: {
			cond: spf3Pattern, // ['Constitution § \/ § Régénération : §', { v: 0, m: 0, s: 0 }],
			qt: spf3Pattern, // ['Temps § \/ § Regain : §', { v: 0, m: 0, s: 0 }],
			energy: spf3Pattern // ['Energie § \/ § Régénération : §', { v: 0, m: 0, s: 0 }]
		}
		, characs_entity: ['solidité']
		, characs_being: ['type d\'organisme', 'résistance tranchante\/perçante']
		, characs_group_caption: {
			solidity: 'Résistance'
			, passive_retort: 'Effet passif'
			, move: 'Déplacement'
			, attack: 'Attaque'
			, attack_remote: 'Attaque à distance'
			, perception: 'Perception'
			, aptitude: 'Aptitude'
		}
		, characs_group_help: {
			solidity: 'Résistance'
			, passive_retort: 'Effet passif'
			, move: 'Déplacement'
			, attack: 'Attaque au contact'
			, attack_remote: 'Attaque à distance'
			, perception: 'Perception'
			, aptitude: 'Aptitude'
		}

		, characs: {
			// entity
			solidity_cut: 'Tranchante/perçante'
			, solidity_blunt: 'Contondante'
			, solidity_acid: 'Acide'
			, solidity_fire: 'Feu'
			, solidity_cold: 'Froid'
			, passive_retort_cut: 'Tranchant/Perçant'
			, passive_retort_acid: 'Acide'
			, passive_retort_elec: 'Electrique'
			, passive_retort_fire: 'Ardent'
			, gist_poisoned: 'Empoisonné' // à la consommation

			, solidity_poison: 'Poison'
			, solidity_elec: 'Electrique'
			// agent
			, move_water: 'Aquatique'
			, move_earth: 'Terrestre'
			, move_air: 'Aérien'
			, attack_cut: 'Tranchante/perçante'
			, attack_blunt: 'Contondante'
			, attack_elec: 'Electrique'
			, attack_fire: 'Ardente'
			, attack_blast: 'Explosion' // Attaque de contact anneau environnant (type souffle explosion : contondant + feu ?)
			, attack_poisoned: 'Empoisonnement ' // Attaques tranchante/perçante au contact et distante empoisonnées
			, attack_remote_cut: 'Tranchante/perçante'
			, attack_remote_blunt: 'Contondante'
			, attack_remote_elec: 'Electrique'
			, attack_remote_fire: 'Ardente'
			, attack_remote_acid: 'Projection d\'acide'
			, capture: 'Capacité de capture'
			, capture_remote: 'Lancer de filet'
			, web: 'Fabrication de toile'
			, attack_bury: 'Affut enterré'
			, perception_diurnal: 'Perception diurne'
			, perception_nocturnal: 'Perception nocturne'
			, perception_modificator: 'Mimétisme passif'
			, hide: 'Camouflage'
			, conscience: 'Conscience'
			, communicate: 'Communication'
			, prehension: 'Préhensile'
		}
		, breed_type: ['autogame', 'mâle', 'femelle', 'hermaphrodite']
		, main_material_types: ['végétal', 'animal']
		//,terrain_name:['Indéfini','Océan','Eau','Sable','Terre','Roche','Plasma','Neige','Lave','Dalles','Pavés']
		// , terrain: string
		,terrain_names: string[]
		, lifeform: 'Forme de vie'
		, no_lifeform: 'Aucune forme de vie'
		, furnitures: 'Objets'
		, distance: spfmPattern
		, distangle: ['Distance § ; Direction §', { dist: 0, angle: 0 }]
		, direction: 'Direction : '
		, orientation: 'Orientation : '
		, theta: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
		, visibility1: 'Visibilité: §'
		, visibility2: ['Visibilité § \/ §', { vis: 0, vis_max: 0 }]
		// cell
		, vegetation: spf2Pattern
		, fertilizer: ['Fertilité § \/ §', { v: 0, m: 0 }]
		, tracks: ['Traces § \/ §', { v: 0, m: 0 }]
		, characs_being_test: {
			'type d\'organisme': ['végétal', 'animal'], 0: 'résistance tranchante\/perçante § \/ 2000'
		}
		, acts_caption: {
			move_to: 'Y aller',
			1: 'Se tourner',
			2: 'Brouter',
			attack: 'Attaquer',
			pointofview: 'Contrôler',
			incarnate: 'Incarner',
			decohere: 'Abandonner la créature'
		}
		, acts_captions: string[]
		, acts_helps: string[]
		, acts_fails: string[]
		, acts_costs: spf2Pattern
		, acts_help: {
			move_to: 'Aller sur cette case',
			1: 'Se tourner dans cette direction',
			2: 'Consommer la végétation',
			attack: 'Attaquer',
			4: 'Prendre le contrôle direct de la créature',
			//5: 'Gérer la créature',
			incarnate: 'Ajouter une nouvelle créature à votre cheptel',
			// decohere: 'Abandonner cette créature'
		}
		, acts_conditions: {
			distance: 'Distance d\'action',
			qt: 'Quota de temps',
			energy: 'Point d\'énergie',
			mana: 'Mana'
		}
		, acts_conditions_lite: {
			same_cell: '(même case)',
			too_far: '(trop éloigné)',
			qt: '§T',
			energy: '§E',
			mana: '§M',
			direction: '(même direction)',
			cannot_move: '(Déplacement impossible)',
			cell_occupied: '(case occupée)'

		}
		, acts_fail: {
			range1: string,
			cannot_contain_being: string,
			qt_energy_insufficient: string
		}
		, input_fail: {
			wrong_identification: 'Identification incorrecte'
			, invalid_format: 'Format invalide'
			, login_unavailable: 'Cet identifiant est déjà utilisé'
			, username_unavailable: 'Ce nom est déjà utilisé'
			, too_many_tries: 'Trop d\'essais erronés, veuillez patienter quelques instants'
		}
		, yf_logbook: {
			creatures: ['§ créature(s).', { n: 0 }]
		}
		, new_reports: 'Nouveau(x) événement(s)'
		, event_report: 'Evenements'
		, no_events: 'Aucun nouvel évèvenement'
		, incarnate_pilotable: 'Sélectionnez la créature avec laquelle vous souhaitez entrer en cohérence'
		, incarnate_no_creature_html: '<p>Aucune créature disponible</p>'
		, detector: { canvas: string, webgl: string, workers: string, websocket: string, file_protocol: string }
		, websocket_connected: string
		, websocket_disconnected: string
		, loading: 'Chargement'
	//	, session_checking: 'Vérification de la validité de la session'
		, limited_1_connexion: 'Vous êtes limité a une connexion WebSocket'
		, x_messages: string[]
		, piloted_availables: spfmPattern
		, piloted_no_available: string
		, pilotable_availables: spfmPattern
		, pilotable_no_available: string
		//, pilotable_request_pending: string
		// , choose_creatures: string
	}
}

var i18n_en: I18n.Corpus = {
	global_error: 'Une erreur est survenue, veuillez nous excuser pour le désagrément.'
	, welcome_name: spfm('Hello {0}')
	, welcome_no_agent_html: '<p>Vous ne possédez aucune enveloppe corporelle. Choisissez les créatures que vous souhaitez incarner grâce au bouton "incarner" :</p><br/><br/><button class="incarnate_button"></button>'
	, welcome_name_short: ['Bienvenue § !', { n: 0 }]
	, disconnected: 'Vous avez été déconnecté et allez être dirigé vers la page d\'identification.'
	, beforeunload: 'Fermeture de la page'
	, cancel: 'Annuler'
	, close: 'Fermer'
	, options: 'Options'
	, conds: ['constitution', 'temps', 'énergie', 'mana']
	, conds_lite: { cond: 'C', qt: 'T', energy: 'E', mana: 'M' }
	, conds_titles: {
		cond: spf3('Constitution {0} \/ {1} Regeneration : {2}'),
		qt: spf3('Temps {0} \/ {1} Regain : {2}'),
		energy: spf3('Energie {0} \/ {1} Regenration : {2}')
	}
	, characs_entity: ['solidité']
	, characs_being: ['type d\'organisme', 'résistance tranchante\/perçante']
	, characs_group_caption: {
		solidity: 'Résistance'
		, passive_retort: 'Effet passif'
		, move: 'Déplacement'
		, attack: 'Attaque'
		, attack_remote: 'Attaque à distance'
		, perception: 'Perception'
		, aptitude: 'Aptitude'
	}
	, characs_group_help: {
		solidity: 'Résistance'
		, passive_retort: 'Effet passif'
		, move: 'Déplacement'
		, attack: 'Attaque au contact'
		, attack_remote: 'Attaque à distance'
		, perception: 'Perception'
		, aptitude: 'Aptitude'
	}

	, characs: {
		// entity
		solidity_cut: 'Tranchante/perçante'
		, solidity_blunt: 'Contondante'
		, solidity_acid: 'Acide'
		, solidity_fire: 'Feu'
		, solidity_cold: 'Froid'
		, passive_retort_cut: 'Tranchant/Perçant'
		, passive_retort_acid: 'Acide'
		, passive_retort_elec: 'Electrique'
		, passive_retort_fire: 'Ardent'
		, gist_poisoned: 'Empoisonné' // à la consommation

		, solidity_poison: 'Poison'
		, solidity_elec: 'Electrique'
		// agent
		, move_water: 'Aquatique'
		, move_earth: 'Terrestre'
		, move_air: 'Aérien'
		, attack_cut: 'Tranchante/perçante'
		, attack_blunt: 'Contondante'
		, attack_elec: 'Electrique'
		, attack_fire: 'Ardente'
		, attack_blast: 'Explosion' // Attaque de contact anneau environnant (type souffle explosion : contondant + feu ?)
		, attack_poisoned: 'Empoisonnement ' // Attaques tranchante/perçante au contact et distante empoisonnées
		, attack_remote_cut: 'Tranchante/perçante'
		, attack_remote_blunt: 'Contondante'
		, attack_remote_elec: 'Electrique'
		, attack_remote_fire: 'Ardente'
		, attack_remote_acid: 'Projection d\'acide'
		, capture: 'Capacité de capture'
		, capture_remote: 'Lancer de filet'
		, web: 'Fabrication de toile'
		, attack_bury: 'Affut enterré'
		, perception_diurnal: 'Perception diurne'
		, perception_nocturnal: 'Perception nocturne'
		, perception_modificator: 'Mimétisme passif'
		, hide: 'Camouflage'
		, conscience: 'Conscience'
		, communicate: 'Communication'
		, prehension: 'Préhensile'
	}
	, breed_type: ['autogame', 'mâle', 'femelle', 'hermaphrodite']
	, main_material_types: ['végétal', 'animal']
	//,terrain_name:['Indéfini','Océan','Eau','Sable','Terre','Roche','Plasma','Neige','Lave','Dalles','Pavés']
	// , terrain: 'Terrain'
	,terrain_names: []
	, lifeform: 'Forme de vie'
	, no_lifeform: 'Aucune forme de vie'
	, furnitures: 'Objets'
	, distance: spfm('Distance {0}')
	, distangle: ['Distance § ; Direction §', { dist: 0, angle: 0 }]
	, direction: 'Direction : '
	, orientation: 'Orientation : '
	, theta: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
	, visibility1: 'Visibilité: §'
	, visibility2: ['Visibilité § \/ §', { vis: 0, vis_max: 0 }]
	// cell
	, vegetation: spf2('Vegetation {0} \/ {1}')
	, fertilizer: ['Fertilité § \/ §', { v: 0, m: 0 }]
	, tracks: ['Traces § \/ §', { v: 0, m: 0 }]
	, characs_being_test: {
		'type d\'organisme': ['végétal', 'animal'], 0: 'résistance tranchante\/perçante § \/ 2000'
	}
	, acts_caption: {
		move_to: 'Y aller',
		1: 'Se tourner',
		2: 'Brouter',
		attack: 'Attaquer',
		pointofview: 'Contrôler',
		incarnate: 'Incarner',
		decohere: 'Abandonner la créature'
	}
	,acts_captions: []
	,acts_helps: []
	, acts_fails: []
	, acts_costs: spf2('({0}T {1}E)')
	, acts_help: {
		move_to: 'Aller sur cette case',
		1: 'Se tourner dans cette direction',
		2: 'Consommer la végétation',
		attack: 'Attaquer',
		4: 'Prendre le contrôle direct de la créature',
		//5: 'Gérer la créature',
		incarnate: 'Ajouter une nouvelle créature à votre cheptel',
		// decohere: 'Abandonner cette créature'
	}
	, acts_conditions: {
		distance: 'Distance d\'action',
		qt: 'Quota de temps',
		energy: 'Point d\'énergie',
		mana: 'Mana'
	}
	, acts_conditions_lite: {
		same_cell: '(même case)',
		too_far: '(trop éloigné)',
		qt: '§T',
		energy: '§E',
		mana: '§M',
		direction: '(même direction)',
		cannot_move: '(Déplacement impossible)',
		cell_occupied: '(case occupée)'

	}
	, acts_fail: {
		range1: 'Inaccessible',
		cannot_contain_being: 'Cell is occupied',
		qt_energy_insufficient: 'QT or energy insufficient'
	}
	, input_fail: {
		wrong_identification: 'Identification incorrecte'
		, invalid_format: 'Format invalide'
		, login_unavailable: 'Cet identifiant est déjà utilisé'
		, username_unavailable: 'Ce nom est déjà utilisé'
		, too_many_tries: 'Trop d\'essais erronés, veuillez patienter quelques instants'
	}
	, yf_logbook: {
		creatures: ['§ créature(s).', { n: 0 }]
	}
	, new_reports: 'Nouveau(x) événement(s)'
	, event_report: 'Evenements'
	, no_events: 'Aucun nouvel évèvenement'
	, incarnate_pilotable: 'Sélectionnez la créature avec laquelle vous souhaitez entrer en cohérence'
	, incarnate_no_creature_html: '<p>Aucune créature disponible</p>'
	, detector: { canvas: 'Canvas', webgl: 'WebGl', workers: 'Workers', websocket: 'WebSocket', file_protocol: 'file:// protocol not allowed' }
	, loading: 'Chargement'
	, websocket_connected: 'Websocket connected'
	, websocket_disconnected: 'Websocket disconnected'
//	, session_checking: 'Vérification de la validité de la session'
	, limited_1_connexion: 'Vous êtes limité a une connexion WebSocket'
	// enum ToStringId { UnkownCommand, ServerError, DatabaseError, SessionError, LoginError, InvalidCaptcha, InvalidCode, InvalidMail, DuplicateName, DuplicateMail, WeakPassword }
	, x_messages: [ 'Unkown command', 'Server error', 'Database error', 'Session expired', 'Login error', 'Invalid captcha', 'Invalid code', 'Invalid mail', 'Name not available', 'Mail not available', 'Password is too weak']
	, piloted_availables: spfm('{0} available creature(s)')
	, piloted_no_available: 'No incarnated creature'
	, pilotable_availables: spfm('{0} available creature(s)')
	, pilotable_no_available: 'No available creature' 
	//, pilotable_request_pending: 'Loading available creatures...'
	//, choose_creatures: 'You own no creatures, choose some !'
}
i18n_en.acts_captions[ActId.ActMoveTo] = 'Go to'
i18n_en.acts_helps[ActId.ActMoveTo] = 'Go to this cell'
i18n_en.acts_captions[ActId.ActTurnTo] = 'Turn to'
i18n_en.acts_helps[ActId.ActTurnTo] = 'Turn toward this direction'
i18n_en.acts_captions[ActId.ActPickUp] = 'Pick'
i18n_en.acts_helps[ActId.ActPickUp] = 'Pick '
i18n_en.acts_captions[ActId.ActLayDown] = 'Lay'
i18n_en.acts_helps[ActId.ActLayDown] = 'Lay '
i18n_en.acts_captions[ActId.ActGive] = 'Give'
i18n_en.acts_helps[ActId.ActGive] = 'Give '
i18n_en.acts_fails[FailId.NoAct] = 'Unknown action'
i18n_en.acts_fails[FailId.RangeIs1] = 'Inaccessible'
i18n_en.acts_fails[FailId.CannotWelcome] = 'Occupied'
i18n_en.acts_fails[FailId.CannotContain] = 'Full'
i18n_en.acts_fails[FailId.SameDirection] = 'Same direction'

i18n_en.terrain_names[CellType.InderteminateCell] = 'Indeterminate'
i18n_en.terrain_names[CellType.CellDeepWater] = 'Ocean'
i18n_en.terrain_names[CellType.CellEarth] = 'Earth'
i18n_en.terrain_names[CellType.CellSand] = 'Sand'
i18n_en.terrain_names[CellType.CellShallowWater] = 'Shallow water'



var i18n_fr: I18n.Corpus = {
	global_error: 'Une erreur est survenue, veuillez nous excuser pour le désagrément.'
	, welcome_name: spfm('Bonjour {0}')
	, welcome_no_agent_html: '<p>Vous ne possédez aucune enveloppe corporelle. Choisissez les créatures que vous souhaitez incarner grâce au bouton "incarner" :</p><br/><br/><button class="incarnate_button"></button>'
	, welcome_name_short: ['Bienvenue § !', { n: 0 }]
	, disconnected: 'Vous avez été déconnecté et allez être dirigé vers la page d\'identification.'
	, beforeunload: 'Fermeture de la page'
	, cancel: 'Annuler'
	, close: 'Fermer'
	, options: 'Options'
	, conds: ['constitution', 'temps', 'énergie', 'mana']
	, conds_lite: { cond: 'C', qt: 'T', energy: 'E', mana: 'M' }
	, conds_titles: {
		cond: spf3('Constitution {0} \/ {1} Régénération : {2}'),
		qt: spf3('Temps {0} \/ {1} Regain : {2}'),
		energy: spf3('Energie {0} \/ {1} Régénération : {2}')
	}
	, characs_entity: ['solidité']
	, characs_being: ['type d\'organisme', 'résistance tranchante\/perçante']
	, characs_group_caption: {
		solidity: 'Résistance'
		, passive_retort: 'Effet passif'
		, move: 'Déplacement'
		, attack: 'Attaque'
		, attack_remote: 'Attaque à distance'
		, perception: 'Perception'
		, aptitude: 'Aptitude'
	}
	, characs_group_help: {
		solidity: 'Résistance'
		, passive_retort: 'Effet passif'
		, move: 'Déplacement'
		, attack: 'Attaque au contact'
		, attack_remote: 'Attaque à distance'
		, perception: 'Perception'
		, aptitude: 'Aptitude'
	}

	, characs: {
		// entity
		solidity_cut: 'Tranchante/perçante'
		, solidity_blunt: 'Contondante'
		, solidity_acid: 'Acide'
		, solidity_fire: 'Feu'
		, solidity_cold: 'Froid'
		, passive_retort_cut: 'Tranchant/Perçant'
		, passive_retort_acid: 'Acide'
		, passive_retort_elec: 'Electrique'
		, passive_retort_fire: 'Ardent'
		, gist_poisoned: 'Empoisonné' // à la consommation

		, solidity_poison: 'Poison'
		, solidity_elec: 'Electrique'
		// agent
		, move_water: 'Aquatique'
		, move_earth: 'Terrestre'
		, move_air: 'Aérien'
		, attack_cut: 'Tranchante/perçante'
		, attack_blunt: 'Contondante'
		, attack_elec: 'Electrique'
		, attack_fire: 'Ardente'
		, attack_blast: 'Explosion' // Attaque de contact anneau environnant (type souffle explosion : contondant + feu ?)
		, attack_poisoned: 'Empoisonnement ' // Attaques tranchante/perçante au contact et distante empoisonnées
		, attack_remote_cut: 'Tranchante/perçante'
		, attack_remote_blunt: 'Contondante'
		, attack_remote_elec: 'Electrique'
		, attack_remote_fire: 'Ardente'
		, attack_remote_acid: 'Projection d\'acide'
		, capture: 'Capacité de capture'
		, capture_remote: 'Lancer de filet'
		, web: 'Fabrication de toile'
		, attack_bury: 'Affut enterré'
		, perception_diurnal: 'Perception diurne'
		, perception_nocturnal: 'Perception nocturne'
		, perception_modificator: 'Mimétisme passif'
		, hide: 'Camouflage'
		, conscience: 'Conscience'
		, communicate: 'Communication'
		, prehension: 'Préhensile'
	}
	, breed_type: ['autogame', 'mâle', 'femelle', 'hermaphrodite']
	, main_material_types: ['végétal', 'animal']
	//,terrain_name:['Indéfini','Océan','Eau','Sable','Terre','Roche','Plasma','Neige','Lave','Dalles','Pavés']
//	, terrain: 'Terrain'
	,terrain_names: []
	, lifeform: 'Forme de vie'
	, no_lifeform: 'Aucune forme de vie'
	, furnitures: 'Objets'
	, distance: spfm('Distance {0}')
	, distangle: ['Distance § ; Direction §', { dist: 0, angle: 0 }]
	, direction: 'Direction : '
	, orientation: 'Orientation : '
	, theta: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
	, visibility1: 'Visibilité: §'
	, visibility2: ['Visibilité § \/ §', { vis: 0, vis_max: 0 }]
	// cell
	, vegetation: spf2('Végétation {0} \/ {1}')
	, fertilizer: ['Fertilité § \/ §', { v: 0, m: 0 }]
	, tracks: ['Traces § \/ §', { v: 0, m: 0 }]
	, characs_being_test: {
		'type d\'organisme': ['végétal', 'animal'], 0: 'résistance tranchante\/perçante § \/ 2000'
	}
	, acts_caption: {
		move_to: 'Y aller',
		1: 'Se tourner',
		2: 'Brouter',
		attack: 'Attaquer',
		pointofview: 'Contrôler',
		incarnate: 'Incarner',
		decohere: 'Abandonner la créature'
	}
	,acts_captions: []
	,acts_helps: []
	, acts_fails: []
	, acts_costs: spf2('({0}T {1}E)')
	, acts_help: {
		move_to: 'Aller sur cette case',
		1: 'Se tourner dans cette direction',
		2: 'Consommer la végétation',
		attack: 'Attaquer',
		4: 'Prendre le contrôle direct de la créature',
		//5: 'Gérer la créature',
		incarnate: 'Ajouter une nouvelle créature à votre cheptel',
		// decohere: 'Abandonner cette créature'
	}
	, acts_conditions: {
		distance: 'Distance d\'action',
		qt: 'Quota de temps',
		energy: 'Point d\'énergie',
		mana: 'Mana'
	}
	, acts_conditions_lite: {
		same_cell: '(même case)',
		too_far: '(trop éloigné)',
		qt: '§T',
		energy: '§E',
		mana: '§M',
		direction: '(même direction)',
		cannot_move: '(Déplacement impossible)',
		cell_occupied: '(case occupée)'

	}
	, acts_fail: {
		range1: 'Inaccessible',
		cannot_contain_being: 'Case occupée',
		qt_energy_insufficient: 'QT ou EN insuffisant'
	}
	, input_fail: {
		wrong_identification: 'Identification incorrecte'
		, invalid_format: 'Format invalide'
		, login_unavailable: 'Cet identifiant est déjà utilisé'
		, username_unavailable: 'Ce nom est déjà utilisé'
		, too_many_tries: 'Trop d\'essais erronés, veuillez patienter quelques instants'
	}
	, yf_logbook: {
		creatures: ['§ créature(s).', { n: 0 }]
	}
	, new_reports: 'Nouveau(x) événement(s)'
	, event_report: 'Evenements'
	, no_events: 'Aucun nouvel évèvenement'
	, incarnate_pilotable: 'Sélectionnez la créature avec laquelle vous souhaitez entrer en cohérence'
	, incarnate_no_creature_html: '<p>Aucune créature disponible</p>'
	, detector: { canvas: 'Canvas', webgl: 'WebGl', workers: 'Workers', websocket: 'WebSocket', file_protocol: 'Protocole file:// non supporté' }
	, loading: 'Chargement'
	, websocket_connected: 'Websocket connecté'
	, websocket_disconnected: 'Websocket déconnecté'
//	, session_checking: 'Vérification de la validité de la session'
	, limited_1_connexion: 'Vous êtes limité a une connexion WebSocket'	
	// enum ToStringId { UnkownCommand, ServerError, DatabaseError, SessionError, LoginError, InvalidCaptcha, InvalidCode, InvalidMail, DuplicateName, DuplicateMail, WeakPassword }
	, x_messages: ['Commande inconnue', 'Erreur serveur', 'Erreur base de donnée', 'Session expirée', "Erreur d'identification", 'Captcha invalide', 'Code invalide', 'Email invalide','Nom indisponible','E-mail indisponible','Mot de passe trop faible']
	, piloted_availables: spfm('Vous possédez {0} créature(s)')
	, piloted_no_available: 'Choisissez les créatures à incarner'
	, pilotable_availables: spfm('{0} créature(s) disponible(s)')
	, pilotable_no_available: 'Aucune créature disponible'
	//, pilotable_request_pending: 'Chargement des créatures disponibles...'
	//, choose_creatures: 'Vous ne possédez aucune créature, choisissez-en !'
}
i18n_fr.acts_captions[ActId.ActMoveTo] = 'Y aller'
i18n_fr.acts_helps[ActId.ActMoveTo] = 'Aller sur cette case'
i18n_fr.acts_captions[ActId.ActTurnTo] = 'Se tourner'
i18n_fr.acts_helps[ActId.ActTurnTo] = 'Se tourner dans cette direction'
i18n_fr.acts_captions[ActId.ActPickUp] = 'Ramasser'
i18n_fr.acts_helps[ActId.ActPickUp] = 'Ramassser '
i18n_fr.acts_captions[ActId.ActLayDown] = 'Poser'
i18n_fr.acts_helps[ActId.ActLayDown] = 'Poser '
i18n_fr.acts_captions[ActId.ActGive] = 'Donner'
i18n_fr.acts_helps[ActId.ActGive] = 'Donner '
i18n_fr.acts_fails[FailId.NoAct] = 'Action inconnue'
//i18n_fr.acts_fails[FailId.Qt] = 'Temps'
//i18n_fr.acts_fails[FailId.Energy] = 'Energie'
i18n_fr.acts_fails[FailId.RangeIs1] = 'Inaccessible'
i18n_fr.acts_fails[FailId.CannotWelcome] = 'Occupée'
i18n_fr.acts_fails[FailId.CannotContain] = 'Plein'
i18n_fr.acts_fails[FailId.SameDirection] = 'Direction identique'

i18n_fr.terrain_names[CellType.InderteminateCell] = 'Indéterminé'
i18n_fr.terrain_names[CellType.CellDeepWater] = 'Océan'
i18n_fr.terrain_names[CellType.CellEarth] = 'Terre'
i18n_fr.terrain_names[CellType.CellSand] = 'Sable'
i18n_fr.terrain_names[CellType.CellShallowWater] = 'Eau peu profonde'

// 'Indéfini','Océan','Eau','Sable','Terre','Roche','Plasma','Neige','Lave','Dalles','Pavés'

var i18n: I18n.Corpus = i18n_fr; // current langage selection TODO (2) : dynamic ? from server configuration ? from browser ?


	

