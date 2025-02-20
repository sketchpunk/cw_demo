# CW Demo

<img src="/images/demo.gif?raw=true">

### TL;DR
This repo is originally created to facilitate a take home test about websockets. Using it as a learning experience & going beyond the scope of the test, I put together a fun learning example for anyone interested in the topic.

The final form of this example is to create a multi-user "game" where you can control a pixel's movement limited in a 2D area. All movement is passed to the server where it manages all the constraints of the character then updates all connected clients of everyone's current position. Additional, a "NPC Bot" is also create so an extra pixel is moving around the scene along with the active users. For extra fun, Gamepad API was used to  include an XBOX360 controller as a usable input to control your pixel character.

The project was also created in steps which can easily be viewed as commits in the repo. For anyone interested in each step & seeing how the code evolved during its development this is how those can see its progress.

The code was written in a way to keep all the important bits within a single page to make it easier for people to review and learn from. Plus the code is organized using regions which automatically trigger the code folding feature in VSCode. The benefits is to keep thing tidy while being able to fold away sections of the file to make it easier to deal with lots of code in a single file.

## Setup

```sh
# Download & initialize project
git clone https://github.com/sketchpunk/cw_demo
npm install

# Start Server
node server.js

# Start Web Client
npm run dev:client
```

## Milestone One - Server
The goal here is to create a websocket server that will function as the backend of the application. It's main use is to take in requests from some UI client interface to execute "jobs" that will then notify the user on its status.

__Commit Code :__ https://github.com/sketchpunk/cw_demo/tree/a9056692be8511c144ce4f650593c02f4698ca2b

#### What library to use?
Looking at some tutorials online the main two libraries I saw being used was either WS or Socket.io. After some investigating Socket.io is what you would you use in production as it has many bells & whistles. WS on the other hand is the bare bones option that can be used for applications that prefer to build their own abstraction layer.

I opted to go with WS for of its low-level design as it will mirror the client side as my choice for that was to use WebSocket API directly without any abstraction layer. Thought this would be a great learning experience & would ultimately be a good tutorial example for anyone interested in learning the topic.

#### Initial setup
I wasn't sure how to develop a server & a client in one project with my choice of web server, vite. Wasn't much information online except doing some sort of "proxy" setup that looked complicated. I asked claude.io for an easier setup, which it provided a very simple solution. First, just run vite like any web project then in a seperate terminal just run the server with "node server.js". After that I just asked claude for a simple starting boiler plate code example of WS. Plus finding documentation for the library threw google along with a vscode plugin to test the server, off I go.

#### Design

- __Server__ : I left it bare bones as I felt there was no real need to build in abtraction layer around it for this project.
- __WSClient Abstraction__ : Neatly box all the code related to handling a single WS socket connect to the user. Things like event handling & how to properly dispose of it when not needed.
- __Messaging__ : I opted to do a simple idea of just passing json with a sort of "message type" property. Was curious if there was "route paths" as an option like how microservice entry points works. After some thought, I decided it wasn't worth persuing as I didn't want to waste to much time going down crazy rabbit holes since a single entry point with message types was enough for this project.
  - JSON Envelope:
    ```json
    {
        "op": "{OPERATION_NAME}",
        ... // Any other properties pertaining to operation
    }
    ```
- __Business Logic__ : In the future it would make sense to package the server & wsclient as a generic library, so I thought about setting up a global key/value pair that can be dynamically set with operation names & arrow functions to be executed. In my previous employment, this is actually how routes where setup, so why not work with what I already now. WSClient is then setup to test if a message is json data and do a look up for the operation name. If found, execute the associated function.
  Example:
  ```javascript
  const ROUTES = {
    "{OPERATION_NAME} : ( ws: WebSocket, json: any )=>{
    
    },
  };
  ```
- __User State__ : Another important feature that the server needed was being able to register new users. I created a new operation that can be called by the client after it connects to the server. Since I had an idea for what to make for milestone 3, I used a global variable to hold a key/value pair object that will contain active users with a bit of state for each. The operation would add them while when a socket ran the close event that would then delete them from the list.
  Example:
  ```javascript
  const USERS = {
    "{USER_ID}": {
        ws     : WebSocket,
        color  : string,
        userId : string, 
        x      : number,
        y      : number,
    }
  }
  ```

## Milestone Two - Client
The goal here is to create a web-based UI that can interact with the websocket server that was created in milestone one. I wanted to try to make a reactive ui but without any libraries or abstractions like react, I wanted a vanilla approach. For this example I put together a simple abstraction around the Proxy object that would create an observer pattern that I can subscribe handlers to specific state changes. From there I only need another light abstraction to manage a websocket connection to a server.

__Commit Code :__ https://github.com/sketchpunk/cw_demo/tree/bb1cf945c4168bd383bb20fb48306f904bef89da

<img src="/images/create_job.png?raw=true">

#### Design
- __State__ : I've used a Proxy to handle state before but for this project I decided to rewrite what I already had. I didn't like the API I originally wrote because it needed a static function to initialize the object like so: _StateProxy.new( {...} )_. I rewrote it so it can be initalized easly as _new StateProxy( {...} )_ plus gave it a new trick to create sub proxies for any pure object found in its heirarchy. The new trick is not needed for this project but its something I've been thinking about for awhile so I took this as an opportunity to improve apon my original design.
  ```javascript
  const state = new StateProxy( { isActive: false, hasXboxCtrl: false } );
  state.$.on( 'isActive', e=>{ 
    const b = e.detail;
    GetElm( 'btnConnect' ).textContent  = b ? 'Disconnect' : 'Connect';
    GetElm( 'pnUI' ).style.display      = b ? '' : 'none';
  });
  ```
- __WebClient__ : Next is to build a wrapper around a WebSocket. The main thing I wanted was the ability to easily connect - disconnect - connect as much as I want with just a single object. Two methods exist to handle just that which will create a socket then close/dispose of it when the user requests it. Another feature is to use EventTarget interally to manage the events that a websocket would trigger. This allows to keep the object reusable & any business logic seperate yet easy to plug into it. Lastly it handles how to send JSON to the websocket by stringify it first before sending it as text.
  ```javascript
  const client = new WebClient();
  client.on( 'active', e=>{ 
    state.isActive = e.detail; // True or False
    if( e.detail ) client.sendJson( { op:'register' } );
  });

  client.connect(); // URL is hardcoded into object, being lazy :)
  ``` 

- __UI__ : For the UI I kept it as simple as possible with some basic html & css. For a lil fun FontAwesome is incuded to render some icons for UI additions done in milestone three.

- From there i put together a button that will function as both for connection & disconnection. Along with a another button to send a "Create Job" operation. Once the message is send, a message is recieved with a job id & the status that its queued. The server then uses a setTimeout to send another message to the client that the job was successful. These job states are visually seen in a div layer under the button. Thought about doing a floating notification instead but I was in a hurry to get to milestone three, so skipped that idea to save time.

## Milestone Three - Pick your poison
In the task document there are a few options that the interviewee can go next in the test. After some thought I chose to go in a completely different direction. Since I like building game engine systems, this presents a great opportunity to take a stab at putting together a  multi-user game mechanic prototype.

#### The Idea
The goal is to allow multiple browsers to be opened where each user can modify the game world state. The state is pretty simple, just a collection of active users and their location in a 2D world. With the state modified, notify all active users of the change so each client can render the 2D world for the user using the HTML Canvas's 2D Context.

#### Steps
- __Step 1__ : Since users are registered, they are given an ID, random color and random location in 2D world. A new notificion was create that will pass along the user list to each client that will render it as a unordered list. The idea here is to see who is currently in the world with you and to know who a person is based on their assigned color. Clients get updated every time a user is added and removed from the global list.
- __Step 2__ : Setup a UI with buttons that can pass along the direction a user wants to move to the server. The server will handle updating the user's location with any constraints to prevent it from moving outside the viewport. I remember reading that game servers tend to do things like this to keep the general world in sync even when users can have laggy connections. I dont know what I'm really doing, so lets try that to get something going. Once the server is fixed up to handle this new operation and able to notify the clients, the results gets rendered onto a 2D canvas.
- __Step 3__ : No game world is complete without some NPCs. With the foundation all set, I added a very basic "user bot" that walks around the game world on its own. This is done with setInterval that updates the bots location every few seconds. I first tried Math.random but the movements wouldn't take it far from its initial spot. Asked google for very cheap noise example & its gemini ai generated something that looked good enough. It was a bit hard to calibrate it since I can't tell what the "noise" looks like visually but it gave better results then Math.random but not as smooth as perlin that Ive used in the past. Since the bot is a user, it appears on the user list & canvas render. I gave it a gray color as a contrast to the users that get set to a random bright color;
- __Step 4__ : I've gone this far down the rabbit hole, why not add an additional input device into the mix. I already have code abstraction made to monitor an xbox 360 & a hotus flight stick with throttle using the Gamepad API. In the end I opted to just use the xbox controller as its more common but not as much fun then a flight stick. I built the contols like how a video game would handle it with a simple API like moveUP, moveDN, etc then each type of input can use those functions. In the end there are HTML buttons for mouse input, keyboard arrow keys and now xbox left joystick as options to control our pixel adventurer.

## Conclusion
Ultimately, it was a fun thing to work on. Did I go over the 3 hour alotted time... Yes i did. Do I reget it... not one bit. It was a good learning experience and I can now say I have a lil experience working with websockets & making a very crude bare bones multi-user experience from scratch using web technologies.

#### Moving forward
- Learning how to better handle multiple users, Im sure my crude attempt goes against any possible best practices or optimization techniques.
- Look into other backend protocols like STOMP, which has a way to subscribe to groups. I can see this functionality like having multiple groups of users having their own gaming experience seperated from other groups.
- How to do this with 3D rendering instead.
- Wonder if ECS would work well on the server end to organize game state & execution of it.

## REFERNCES
- WS Node Package : https://github.com/websockets/ws/blob/master/doc/ws.md
- Websocket API : https://developer.mozilla.org/en-US/docs/Web/API/WebSocket 
- Websocket Client: https://marketplace.visualstudio.com/items?itemName=mohamed-nouri.websocket-client
  - Used to develop the server before working on the client side
- Proxy for ui state management : https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
- Used Claude.io to help figure out how to setup a project to run vite as a webserver & run a websocket server with node