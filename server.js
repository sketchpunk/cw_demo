// #region IMPORTS
// https://github.com/websockets/ws/blob/master/doc/ws.md
import { WebSocketServer } from 'ws';
// #endregion

// #region CONSTANTS / GLOBAL
const PORT = 8080;
let USERS = {};
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

// #region LOGIC

const ROUTES = {

    // { "op":"register" }
    'register': ws=>{
        const color  = hsvRGB( Math.random() );
        
        addUser( ws, color, ws.__client.id );
        sendJson( ws, { op:'register', color, userId: ws.__client.id } );

        pushUserList(); // Notify everyone about new user

        // console.log( 'Registering user', color, ws.__client.id );
    },

    // { "op":"create_job" }
    'create_job': ws=>{
        const id = uuid();
        sendJson( ws, { op:'create_job', jobID: id, status: 'QUEUED' } );

        setTimeout( ()=>{
            sendJson( ws, { op:'create_job', jobID: id, status: 'SUCCESS' } );
        }, 3000 );
    },

};

function sendJson( ws, json ){ ws.send( JSON.stringify( json ) ) }

function addUser( ws, color, userId ){
    USERS[ userId ] = { ws, color, userId };
}

function delUser( userId ){
    delete USERS[ userId ];
}

function pushUserList(){
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Generate user list
    const list = [];
    for( const i of Object.values( USERS ) ){
        list.push( {
            userId  : i.userId,
            color   : i.color,
        } );
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Push list to all active users
    const json = { op: 'user_list', list };
    for( const i of Object.values( USERS ) ){
        sendJson( i.ws, json );
    }
}

// #endregion

// #region CLIENT SOCKET HANDLER
class WSClient{
    constructor( ws ){
        this.ws = ws;
        this.id = uuid();

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
        // Get rid of the user from the list
        delUser( this.ws.__client.id );

        // Cleanup
        this.ws.off( 'open',      this.onOpen );
        this.ws.off( 'message',   this.onMessage );
        this.ws.off( 'close',     this.onClose );
        this.ws.off( 'error',     this.onError );
        this.ws.off( 'ping',      this.onPing );
        this.ws.off( 'pong',      this.onPong );
        this.ws.__client    = null;
        this.ws             = null;

        // Notify all users that user has been logged out
        pushUserList();

        // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
        // 1000: Normal closure – The connection is closed normally (the connection is successfully finished).
        // 1001: Going away – The server is shutting down (e.g., the server is going offline).
        // 1002: Protocol error – There was a protocol violation, such as receiving an invalid frame.
        // 1003: Unsupported data – The server does not support the type of data being sent.
        // 1006: Abnormal closure – The connection was closed unexpectedly (for example, no close frame was received).

        // 1005: No Status:Reserved. NOTE: When user chooses to disconnect I get this code value
    };

    onMessage = ( buf )=>{

        // Test if the first character is a "{", it can be a sign that its JSON data
        if( buf.length > 0 && buf[0] === 123 ){
            try{
                const json = JSON.parse( buf.toString() );
                if( json.op ){
                    const op = ROUTES[ json.op ];
                    if( op ) op( this.ws, json );
                }
            }catch( err ){
                console.log( 'ERROR ONMESSAGE', buf.toString(), err );
            }
        }
        
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

// #region HELPERS
// Values 0 & 1, Hue, sat, value ( light )
function hsvRGB( h, s= 1.0, v= 1.0 ){
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Convert HSV to NORMALIZED RGB
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let col;

    switch( i % 6 ){
        case 0: col = [ v, t, p ]; break;
        case 1: col = [ q, v, p ]; break;
        case 2: col = [ p, v, t ]; break;
        case 3: col = [ p, q, v ]; break;
        case 4: col = [ t, p, v ]; break;
        case 5: col = [ v, p, q ]; break;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Convert color the integer
    const cn =  (~ ~( col[ 0 ] * 255 )) << 16 |
                (~ ~( col[ 1 ] * 255 )) << 8  |
                (~ ~( col[ 2 ] * 255 ));

    // Then convert integer to hex string
    return '#'+('000000' + cn.toString( 16 )).substr( -6 );
}

function uuid(){
    // let dt = new Date().getTime();
    // if( window.performance && typeof window.performance.now === 'function' ) dt += performance.now(); // use high-precision timer if available
    
    // Change to work in Node
    const hrTime = process.hrtime(); // Returns [seconds, nanoseconds]
    let dt = hrTime[0] * 1000 + hrTime[1] / 1e6; // Convert to milliseconds

    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, c=>{
        const r = ( dt + Math.random() * 16 ) % 16 | 0;
        dt = Math.floor( dt / 16 );
        return ( ( c == 'x' )? r : ( r & 0x3 | 0x8 ) ).toString( 16 );
    });

    return id;
}

// #endregion

// #region STARTUP
initServer();
// #endregion