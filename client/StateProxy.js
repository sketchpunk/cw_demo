
// Check if an object is not a class instance
function isPlainObject( o ){
    return o !== null && typeof o === 'object' && Object.getPrototypeOf( o ) === Object.prototype;
}

// Handler Object
class StateHandler{
    path = '';      // Object Path
    $    = null;    // Controller Object
    
    constructor( $, path='' ){
        this.$    = $;
        this.path = path;
    }
    
    get( target, prop, receiver ){
        // console.log( "GET", "target", target, "prop", prop, "rec", receiver, 'path', this.path + prop );
        
        // Pass Controller instead
        if( prop === '$' ) return this.$;
        
        // Pass Value
        return Reflect.get( target, prop, receiver );
    }

    set( target, prop, value ){
        // console.log( "SET", "target", target, "prop", prop, "value", value, 'prev', Reflect.get( target, prop ), 'path', this.path + prop );
        
        // Exit if its the controller
        if( prop === '$' ) return false;

        // Only update the state if the value is different
        if( Reflect.get( target, prop ) !== value ){
            const path = this.path + prop;
            Reflect.set( target, prop, value );                 // Save data to Object
            this.$.emit( path, value );                         // Emit event that path property changed
            this.$.emit( 'change', { prop, path, value } );     // Emit event that any property changed
            // NOTE : Maybe emit the path too, so user can sub to root.child and get updates for child.x, child.y, etc
        }
        return true;
    }
} 

// Controller Object
class $State{
    // #region EVENTS
    events = new EventTarget();
    on( evtName, fn ){
        this.events.addEventListener( evtName, fn );
        return this;
    }

    off( evtName, fn ){
        this.events.removeEventListener( evtName, fn );
        return this;
    }

    once( evtName, fn ){
        this.events.addEventListener( evtName, fn, { once:true } ); 
        return this;
    }
    
    emit( evtName, data ){
        console.log( 'EMIT', evtName, data );
        this.events.dispatchEvent( new CustomEvent( evtName, { detail:data, bubbles: false, cancelable:true, composed:false } ) );
        return this;
    }
    // #endregion
}

export default class StateProxy{
    constructor( obj ){
        // Do deep proxy of the object by replacing any sub object with a proxy
        const $     = new $State();
        const root  = {};
        const stack = [ { path:'', key:'', src:obj, obj:root, parent:null } ];
        let itm;
        let k;
        let v;

        while( stack.length > 0 ){
            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            // Process Stack Item
            itm = stack.pop();
            for( k in itm.src ){
                v = itm.src[ k ];

                // Wrap any plain object with a proxy
                if( isPlainObject( v ) ) 
                    stack.push( { 
                        path    : itm.path + k + '.', 
                        key     : k, 
                        src     : v, 
                        obj     : {}, 
                        parent  : itm.obj,
                    } );
                else // Or just add value to object      
                    itm.obj[ k ] = v;
            }

            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            // Create Sub Proxy
            if( itm.parent ){
                itm.parent[ itm.key ] = new Proxy( itm.obj, new StateHandler( $, itm.path ) );
            }
        }

        return new Proxy( root, new StateHandler( $ ) );
    }
}