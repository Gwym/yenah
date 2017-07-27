

// Tu vas m'faire une scène, nan ?!

interface Scene {

	activate(): void;
	inactivate(): void;
}

class MainScene implements Scene {

	showMainSceneButton: HTMLElement
	showBeingSceneButton: HTMLElement
	pilotedMiniCardDeck: HTMLElement

	protected selectedTile: Tile | null = null;
    protected selectedCard: HTMLDivElement
    protected hoverCard: HTMLDivElement

    protected actorCard: ActorHtmlCard
    protected targetCard: TargetCellHtmlCard

	constructor(container: HTMLElement) {

		this.showMainSceneButton = <HTMLElement>document.getElementById('show_main_scene_button');
		this.showMainSceneButton.addEventListener('click', () => {
			ui.switchToMainScene();
		} // TODO (5) save old current sccene3D and restore ?
		);

		this.showBeingSceneButton = <HTMLButtonElement>document.getElementById('show_being_scene_button');
		this.showBeingSceneButton.addEventListener('click', function () {
			// TODO (3) : timeout ?
			let requestPilot: PilotRequest = {
				type: MessageType.ReqPilot,
				piloted: { limit: 20 },
				pilotable: { limit : 20 }
			};
			G_channel.send(requestPilot);

			ui.startSplash(ui.beingsScene);
		});

		this.pilotedMiniCardDeck = <HTMLButtonElement>document.getElementById('piloted_beings');
        this.selectedCard = <HTMLDivElement>document.getElementById('selectedTile');
        this.hoverCard = <HTMLDivElement>document.getElementById('hoverTile');

        this.actorCard = new ActorHtmlCard(container);
        this.targetCard = new TargetCellHtmlCard(container);
	}

	refreshPiloted(pilotedPool: Zone3DLoaderDictionary) {

		HtmlUI.empty(this.pilotedMiniCardDeck);

		let keys = Object.keys(pilotedPool)
		console.log('mainScene.refreshPiloted > agents:' + keys.length);

		for (let i = 0 ; i < keys.length; i++) {
			if (pilotedPool[keys[i]].miniCard) {
				this.pilotedMiniCardDeck.appendChild(pilotedPool[keys[i]].miniCard);
			}
		}
	}

	activate() {
		console.log('MainScene.activate > ');
		this.showMainSceneButton.style.visibility = 'hidden';
		this.showBeingSceneButton.style.visibility = 'visible';
		this.pilotedMiniCardDeck.style.visibility = 'visible';
	}

	inactivate() {
		console.log('MainScene.inactivate > ');
		this.showBeingSceneButton.style.visibility = 'hidden';
		this.pilotedMiniCardDeck.style.visibility = 'hidden';
		this.actorCard.setZone(null);
		this.targetCard.unsetCell();
	}

    setActorCardTile(zone3D: Zone3D | null) {
        this.actorCard.setZone(zone3D);
    }

    setCellTargetCard(zone: RelZone, cell: Cell) {
        this.targetCard.setCell(zone, cell);
    }
    
}

class BeingsScene implements Scene {

	deckContainer: HTMLDivElement
	pilotableDeck: HTMLDivElement
	pilotedDeck: HTMLDivElement
	displayPilotable: HTMLDivElement
	displayPiloted: HTMLElement

	//	refreshPilotableTimestamp = 0
	//	refreshPilotedTimestamp = 0

	constructor() {
		this.deckContainer = <HTMLDivElement>document.getElementById('being_scene');
		this.pilotableDeck = <HTMLDivElement>document.getElementById('pilotable');
		this.pilotedDeck = <HTMLDivElement>document.getElementById('piloted');
		this.displayPilotable = <HTMLDivElement>document.getElementById('display_pilotable_message');
		this.displayPiloted = <HTMLDivElement>document.getElementById('display_piloted_message');


		Pointer.makeDroppable(this.pilotableDeck);
		Pointer.makeDroppable(this.pilotedDeck);

		// TODO (2) init displayPilotable.textContent = i18n.nopilotable ?

		this.inactivate();
	}

	activate() {
		console.log('BeingScene.activate > ');
		ui.mainScene.showMainSceneButton.style.visibility = 'visible';
		this.deckContainer.style.visibility = 'visible';

		//	let lastRefresh = Date.now() - this.refreshPilotableTimestamp;
		//	if (lastRefresh > 10000) { // 10s
		//		console.log('refresh pilotable ' + (lastRefresh / 1000));
		// this.displayPilotable.textContent = i18n.pilotable_request_pending;

		/*	}
			else {
				console.log('no refresh pilotable ' + (lastRefresh / 1000));
			} */
	}

	inactivate() {
		console.log('BeingScene.inactivate > ');
		this.deckContainer.style.visibility = 'hidden';
	/*	UI.empty(this.pilotedDeck);
		UI.empty(this.pilotableDeck);
		this.displayPilotable.textContent = '';
		this.displayPiloted.textContent = ''; */
	}

	refreshPiloted(pilotedPool: Zone3DLoaderDictionary) {

		//	this.refreshPilotedTimestamp = Date.now();
		HtmlUI.empty(this.pilotedDeck);

		let card: PilotedCardWrapper;
		let count = 0;
		//	let h1: HTMLHeadingElement;

		for (let indirectionIId in pilotedPool) { // transId : TransientIdentifier
			count++;
			card = <PilotedCardWrapper><HTMLElement>document.createElement('div');
			card.indirectId = indirectionIId;
			card.id = Pointer.toCardIdStr(indirectionIId);
			card.textContent = pilotedPool[indirectionIId].actorName;
			card.className = 'pilotedCard';
			card.style.backgroundImage = pilotedPool[indirectionIId].cardUrl; 
			Pointer.makeDraggable(card);
			this.pilotedDeck.appendChild(card);
		}

		if (count === 0) {
			this.displayPiloted.textContent = i18n.piloted_no_available;
		} else {
			this.displayPiloted.textContent = i18n.piloted_availables(count);
		}

		// this.highlight(true);
	}

	refreshPilotable(pilotablePool: PilotableTransientIdDao[]) {

			HtmlUI.empty(this.pilotableDeck);

			//	this.refreshPilotableTimestamp = Date.now();

			if (pilotablePool.length === 0) {
				console.log('onPilotable > No pilotable beings');
				this.displayPilotable.textContent = i18n.pilotable_no_available;
			} else {
				this.displayPilotable.textContent = i18n.pilotable_availables(pilotablePool.length);

				console.log('onPilotable > agents:' + pilotablePool.length);

				let card: CardWrapper;
				// let h1: HTMLHeadingElement;

				for (let indirectionIId = 0; indirectionIId < pilotablePool.length; indirectionIId++) {

					console.log(pilotablePool[indirectionIId]);

					card = <CardWrapper><HTMLElement>document.createElement('div');
					card.transId = pilotablePool[indirectionIId].transId;
					card.id = Pointer.toCardIdStr(pilotablePool[indirectionIId].transId);
					card.textContent = pilotablePool[indirectionIId].name;
					card.className = 'pilotableCard';
					card.style.backgroundImage = WorldUI.getCardUrl(pilotablePool[indirectionIId].classId);
					Pointer.makeDraggable(card);
					this.pilotableDeck.appendChild(card);
				}
			}

			if (ui.pendingScene === ui.beingsScene) {
				ui.switchToBeingScene();
			}
			else {
				this.highlight(true);
			}
		
	}

	highlight(pilotableChange: boolean) {
		if (this.deckContainer.style.visibility === 'visible') {
			console.log('TODO being scene highlight blink' + pilotableChange);

		} else {
			console.log('TODO being scene icon highlight blink');
			ui.mainScene.showBeingSceneButton.className = 'buttonHighlight';
		}
	}

}




