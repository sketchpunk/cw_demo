// #region IMPORTS
// https://github.com/websockets/ws/blob/master/doc/ws.md
import { WebSocketServer } from 'ws';
// #endregion

// #region CONSTANTS / GLOBAL
const PORT          = 8080;            // Server listening port
const WORLD_SIZE    = [ 400, 350 ];    // Size of the 2d canvas
const SPEED         = 20;              // Distance to move user
const PNT_SIZE      = 10;              // Size of point drawn on canvas
const BOT_TIME_SEC  = 3;               // Timer for bot's movement

let USERS = {};                     // List of activer users
let serv;                           // Global ref to Socket Server
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

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    initBot();
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

        pushUserList();         // Notify everyone about new user
        pushUserLocations();    // Notify everyone user locations

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

    // { "op":"move_point", "userId":"x", "x":1, "y":0 }
    'move_point': ( ws, json )=>{
        // console.log( 'MovePoint', json );
        moveUser( json.userId, json.x, json.y );
    },
};

function sendJson( ws, json ){ ws.send( JSON.stringify( json ) ) }

function addUser( ws, color, userId ){
    USERS[ userId ] = { 
        ws, color, userId, 
        x : Math.round( Math.random() * WORLD_SIZE[0] ),
        y : Math.round( Math.random() * WORLD_SIZE[1] ),
    };
}

function delUser( userId ){
    delete USERS[ userId ];
}

function moveUser( userId, x, y ){
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const usr = USERS[ userId ];
    if( !usr ){
        console.log( 'move_point: user not found - ', userId );
        return;
    }

    let isOk = false;
    let p    = 0;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Try to move user to new position
    if( x ){
        p = usr.x + x * SPEED;
        if( p < 0 ) p = 0;
        if( p >= WORLD_SIZE[0] - PNT_SIZE ) p = WORLD_SIZE[0] - PNT_SIZE;
        if( p !== usr.x ){
            usr.x = p;
            isOk  = true;
        }
    }

    if( y ){
        p = usr.y + y * SPEED;
        if( p < 0 ) p = 0;
        if( p >= WORLD_SIZE[1] - PNT_SIZE ) p = WORLD_SIZE[1] - PNT_SIZE;
        if( p !== usr.y ){
            usr.y = p;
            isOk  = true;
        }
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // If movement passes all move constraints, notify all users
    if( isOk ) pushUserLocations();
}

function pushUserList(){
    // Generate user list
    const list = [];
    for( const i of Object.values( USERS ) ){
        list.push( {
            userId  : i.userId,
            color   : i.color,
        } );
    }

    pushToAll( { op: 'user_list', list } );
}

function pushUserLocations(){
    // Generate user location list
    const list = [];
    for( const i of Object.values( USERS ) ){
        list.push( {
            color   : i.color,
            x       : i.x,
            y       : i.y,
        } );
    }

    pushToAll( { op: 'user_loc', list } );
}

function pushToAll( json ){
    const str = JSON.stringify( json );
    for( const i of Object.values( USERS ) ) i.ws?.send( str );
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

        // Notify all users of new list & positions
        pushUserList();
        pushUserLocations();

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

// #region BOT

function initBot(){
    addUser( null, '#505050', 'bot' );
    setInterval( moveBot, BOT_TIME_SEC * 1000 );
}

function moveBot(){
    // Dont run bot if no users are logged in, only user should be bot
    if( USERS.length > 1 ) return;

    // Random movement for bot, use same user controls
    // const x = Math.round( 2 * Math.random() ) - 1;
    // const y = Math.round( 2 * Math.random() ) - 1;

    // Random didn't give a good result, 
    // lets try noise as it always did a good job in the past
    const t = Date.now() / 1000;
    const x = 3 * smoothNoise( t, 0 ) - 1.5;
    const y = 3 * smoothNoise( t + 0.5, 101 ) - 1.5;
    moveUser( 'bot', x, y );

    // console.log( 'Moving Bot', t, x, y );
}

function smoothNoise(x, y) {
    const xInt = Math.floor(x);
    const yInt = Math.floor(y);
    const xFrac = x - xInt;
    const yFrac = y - yInt;
  
    const v1 = random(xInt, yInt);
    const v2 = random(xInt + 1, yInt);
    const v3 = random(xInt, yInt + 1);
    const v4 = random(xInt + 1, yInt + 1);
  
    const i1 = interpolate(v1, v2, xFrac);
    const i2 = interpolate(v3, v4, xFrac);
  
    return interpolate(i1, i2, yFrac);
  }
  
  function interpolate(a, b, t) {
    return (1 - t) * a + t * b;
  }
  
  function random(x, y) {
    const seed = x * 57 + y * 577;
    return (Math.sin(seed) * 43758.5453 + seed) % 1;
  }

// #endregion

// #region STARTUP
initServer();
// #endregion