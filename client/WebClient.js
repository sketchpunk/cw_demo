export default class WebClient{
    // #region MAIN
    socket = null;
    events = new EventTarget();

    constructor(){}
    // #endregion

    // #region GETTERS
    
    get isOpen(){ return ( this.socket && this.socket.readyState === WebSocket.OPEN ); }

    // #endregion

    // #region METHODS
    connect(){
        if( !this.socket ){
            this.socket = new WebSocket( 'ws://localhost:8080' );
            this.socket.addEventListener( 'open', this.onOpen );
            this.socket.addEventListener( 'close', this.onClose );
            this.socket.addEventListener( 'message', this.onMessage );
            this.socket.addEventListener( 'error', this.onError );
        }
    }

    disconnect(){
        if( this.socket ){
            console.log( 'Calling disconnect' );
            this.socket.close();
            this.socket.removeEventListener( 'open', this.onOpen );
            this.socket.removeEventListener( 'close', this.onClose );
            this.socket.removeEventListener( 'message', this.onMessage );
            this.socket.removeEventListener( 'error', this.onError );
            this.socket = null;
            this.emit( 'active', false );
        }
    }
    // #endregion

    // #region WEBSOCKET EVENTS
    onOpen = ()=>{
        console.log( '---Connection opened', this.socket.readyState );
        this.emit( 'active', true );
    };

    onMessage = e=>{
        console.log( 'Message from server ', e.data );
    };

    onError = e=>{ console.log( '---ERROR', e ); };

    onClose = e=>{
        console.log( '---CLOSE' );
        this.emit( 'active', false );
    };
    // #endregion

    // #region EVENT MANAGEMENT
    on( evtName, fn ){ this.events.addEventListener( evtName, fn ); return this; }
    off( evtName, fn ){ this.events.removeEventListener( evtName, fn ); return this; }
    once( evtName, fn ){ this.events.addEventListener( evtName, fn, { once:true } ); return this; }
    emit( evtName, data ){ this.events.dispatchEvent( new CustomEvent( evtName, { detail:data, bubbles: false, cancelable:true, composed:false } ) ); return this; }
    // #endregion

}