// #region IMPORTS
// https://github.com/websockets/ws/blob/master/doc/ws.md
import { WebSocketServer } from 'ws';
// #endregion

// #region CONSTANTS
const PORT = 8080;
let serv;
// #endregion

// #region SERVER
async function initServer(){
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    console.log( 'Setting up SERVER Object' );
    serv = new WebSocketServer( { port: PORT, clientTracking:true, autoPong:true } );

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    console.log( 'Binding SERVER Events' );

    serv.on( 'close', onServerClose );
    serv.on( 'error', onServerError );
    serv.on( 'wsClientError', onClientError );
    serv.on( 'listening', onServerListening );
    serv.on( 'upgrade', onServerUpgrade );
    serv.on( 'headers', onServerHeaders );
    serv.on( 'connection', (ws, req)=>{
        console.log( '---Connection Established' );
        ws.__client = new WSClient( ws );

        // console.log( req.socket.remoteAddress ); // ::1 means client IP === server.IP
        // console.log( req.rawHeaders );
        // console.log( req.headers );
        // console.log( req.url ); // UrlSearchParams( req.url );
        // console.log( ws.readyState );
        // console.log( ws.upgradeReq );
        // console.log( serv.clients.has( ws ) );
    });
}

function onServerHeaders( h, req ){ 
    // console.log( '---Headers', h ); 
    console.log( '---Headers' ); 
}
function onServerListening(){
    const addr = serv.address();
    console.log( `Listening on ws://localhost:${addr.port}` );
    // console.log( addr.port );
    // console.log( addr.address );
    // console.log( addr.family );
}
function onServerClose(){ console.log( '---Server shutting down---'); }
function onServerError( err ){
    console.log( '---Server Error---');
    console.log( err );
}

function onClientError( err, socket, req ){
    console.log( '---WS Client Error---' );
    console.log( 'Msg', err.message );
    console.log( 'Stack', err.stack );
    console.log( 'Error', err );
}

// Get Access to raw HTTP Request
function onServerUpgrade( req, socket, head ){
    console.log( `Uprade`, head );
}
// #endregion

// #region CLIENT SOCKET HANDLER
class WSClient{
    constructor( ws ){
        this.ws = ws;
        ws.on( 'open',      this.onOpen );
        ws.on( 'message',   this.onMessage );
        ws.on( 'close',     this.onClose );
        ws.on( 'error',     this.onError );
        ws.on( 'ping',      this.onPing );
        ws.on( 'pong',      this.onPong );

        // ws.readyState
        // CONNECTING	0	The connection is not yet open.
        // OPEN	        1	The connection is open and ready to communicate.
        // CLOSING	    2	The connection is in the process of closing.
        // CLOSED	    3	The connection is closed.
    }

    // #region EVENTS
    onOpen = ()=>{ console.log( '---Client Open' ); };

    onClose = ( status, reason )=>{
        console.log( '---Client Disconnected', status, reason.toString() );
        this.ws.off( 'open',      this.onOpen );
        this.ws.off( 'message',   this.onMessage );
        this.ws.off( 'close',     this.onClose );
        this.ws.off( 'error',     this.onError );
        this.ws.off( 'ping',      this.onPing );
        this.ws.off( 'pong',      this.onPong );
        this.ws.__client    = null;
        this.ws             = null;

        // 1000: Normal closure – The connection is closed normally (the connection is successfully finished).
        // 1001: Going away – The server is shutting down (e.g., the server is going offline).
        // 1002: Protocol error – There was a protocol violation, such as receiving an invalid frame.
        // 1003: Unsupported data – The server does not support the type of data being sent.
        // 1006: Abnormal closure – The connection was closed unexpectedly (for example, no close frame was received).
    };

    onMessage = ( msg )=>{
        console.log( 'message', typeof msg, msg.toString() );
        console.log( msg.length );

        // setTimeout( ()=>{
        //     this.ws.send( 'W00T!' );
        // }, 2000 );
    };

    onError = ( err )=>{
        console.log( '---Client Error' );
        console.log( 'Msg', err.message );
        console.log( 'Stack', err.stack );
        console.log( 'Error', err );
    };

    onPing = ( data, mask )=>{ console.log( '---Client Ping' ); };
    onPong = ( data, mask )=>{ console.log( '---Client Pong' ); };
    // #endregion
}
// #endregion

// #region STARTUP
initServer();
// #endregion