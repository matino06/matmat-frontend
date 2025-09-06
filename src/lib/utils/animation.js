export class ActionBlock {
    constructor() {
        this.doActions = [];
        this.undoActions = [];
    }

    addDo(action) {
        this.doActions.push(action);
    }

    addUndo(action) {
        this.undoActions.push(action);
    }

    executeDo() {
        this.doActions.forEach(action => {
            action()
        });
    }

    executeUndo() {
        this.undoActions.forEach(action => {
            action()
        });
    }
}

export class Animation {
    constructor() {
        this.doBlocks = [];
        this.undoBlocks = [];

        this.canDo = false;
        this.canUndo = false;

        this.observers = [];
    }

    addDoBlockToBottom(block) {
        this.doBlocks.unshift(block);

        this.notifyObserver();
    }

    subscribe(observer) {
        this.observers.push(observer);
    }

    do() {
        this.blockDoAndUndo();

        const block = this.doBlocks.pop();
        this.undoBlocks.push(block);

        block.executeDo();

        setTimeout(() => {
            this.notifyObserver();
        }, 4000);
    }

    undo() {
        this.blockDoAndUndo();

        const block = this.undoBlocks.pop();
        this.doBlocks.push(block);

        block.executeUndo();

        setTimeout(() => {
            this.notifyObserver();
        }, 4000);
    }

    blockDoAndUndo() {
        this.observers.forEach(observer => {
            observer.updateDoUndoState(
                false,
                false
            )
        });
    }

    notifyObserver() {
        this.observers.forEach(observer => {
            observer.updateDoUndoState(
                !!this.doBlocks.length,
                !!this.undoBlocks.length
            )
        });
    }
}