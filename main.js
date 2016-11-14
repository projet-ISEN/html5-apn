// Grab elements, create settings, etc.
let canvas = document.getElementById('canvas');
let video = document.getElementById('video');
let shootButton = document.getElementById("shoot");
let resetButton = document.getElementById("reset");
let saveButton = document.getElementById("save");
let tracking = document.getElementById('tracking');
let picLong = document.getElementById("picLong");
let picLat = document.getElementById("picLat");
let picAlt = document.getElementById("picAlt");
let picDate = document.getElementById("picDate");
let context = canvas.getContext('2d');
let dateField = document.getElementById("infos");
let cardselector = $(".cardZone");
/**
 * GPS position
 */
let position = {};
let map = {};
let mapMarkers = [];

/**
 * Canvas
 */
let stateStream = true;
let lastImageRedraw = false;

/**
 * Init DB
 */
let db = new Dexie("cameraApp");
let dbOK = true;
let pics = [];
db.version(1).stores({
    pics: 'id, url, gps'
});

db.open().catch((e) => {
    console.error(e);
    dbOK = false;
});

/**
 * Draw a target on canvas
 */
function drawTarget() {
    let unitWidth       = canvas.width / 8;
    let unitHeight      = canvas.height / 8;
    context.lineCap     = 'round';
    context.lineWidth   = 3;
    // Circle
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 8, 0, 2*Math.PI);
    context.stroke();
    // Vertical axes
    context.moveTo(2*unitWidth, 4*unitHeight);
    context.lineTo(3*unitWidth, 4*unitHeight);
    context.stroke();
    context.moveTo(5*unitWidth, 4*unitHeight);
    context.lineTo(6*unitWidth, 4*unitHeight);
    context.stroke();
    // Horizontal axes
    context.moveTo(4*unitWidth, 2*unitHeight);
    context.lineTo(4*unitWidth, 3*unitHeight);
    context.stroke();
    context.moveTo(4*unitWidth, 5*unitHeight);
    context.lineTo(4*unitWidth, 6*unitHeight);
    context.stroke();
}


/**
 * Request and start Camera
 */
navigator.getUserMedia({
  audio: false,
  video: {
    width: {
        min: 400,
        ideal: 600,
        max: 800
    },
    height: {
        min: 400,
        ideal: 600,
        max: 800
    },
  }
}, (stream) => {
    video.src = URL.createObjectURL(stream);
}, (err) => {
  console.error("Your browser doesn't support this feature", err);
});

/**
 * draw Camera stream on canvas, add the target, freeze if photo is taken
 */
function drawCamera() {
    if(stateStream) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawTarget();
    } else {
        if (!lastImageRedraw) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            lastImageRedraw = true;
        }
    }
    window.requestAnimationFrame(drawCamera);
}


/**
 * When a photo taken
 */
shootButton.addEventListener("click", (e) => {
    // Display
    stateStream = false;
    let now = Date.now();
    context.drawImage(video, 0, 0, video.width, video.height);
    picLong.value = position.longitude;
    picLat.value = position.latitude;
    //picAlt.innerHTML = position.altitude;
    picDate.innerHTML = now;
    //console.log(context.getImageData(0, 0, canvas.width, canvas.height));
    var temp=  {
        id: now,
        url: canvas.toDataURL(), // context.getImageData(0, 0, canvas.width, canvas.height),
        gps: {
            long: position.longitude,
            lat: position.latitude,
            alt: position.altitude
        }
    };
    // STORE PICS
    db.pics.put(temp).then(() => {
        console.info('Image stored');
    }).catch((err) =>  {
        console.error(error);
    });


    // Update MAP
    addMarker(position.latitude, position.longitude, `<img src=\"${canvas.toDataURL()}\" />`);
    map.flyTo(L.latLng(position.latitude, position.longitude));
});

/**
 * When photo is reset
 */
resetButton.addEventListener('click', (e) => {
    stateStream = true;
    lastImageRedraw = false;
    picLong.innerHTML = "";
    picLat.innerHTML = "";
    picAlt.innerHTML = "";
    picDate.innerHTML = "";
});

/**
 * When you want to save a photo
 */
saveButton.addEventListener('click', (e)=> {
    window.open(canvas.toDataURL(), '_TOP');
});

/**
 * Open tracking window
 */
tracking.addEventListener('click', (e) => {
    // Pause stream
    stateStream = false;
    window.open('./tracking.html', '_blank', 'fullscreen=yes,menubar=no,statusbar=no,scrollbars=no,width=250,height=300');
});

/**
 * When we get response from tracking window
 */
window.addEventListener('message', (e) => {
    console.log(e);
    if(e.data.img) {
        console.log("We got an image!");
    
        // unPause camera stream
        stateStream = false;

        // STORE PICS
        db.pics.put({
            id: Date.now(),
            url: e.data.img, // context.getImageData(0, 0, canvas.width, canvas.height),
            gps: {
                long: position.longitude,
                lat: position.latitude,
                alt: position.altitude
            }
        }).then(() => {
            console.info('Image stored');
        }).catch((err) =>  {
            console.error(error);
        });

        // Update MAP
        addMarker(position.latitude, position.longitude, `<img src=\"${e.data.img}\" />`);
        map.flyTo(L.latLng(position.latitude, position.longitude));
    }
});

/**
 * Build a list based on items
 */

/**
 *
 * @param {any} data
 * @returns
 */
function buildList(data) {
    let i, item, ref = {}, counts = {};
    function ul() {
        return document.createElement('ul');
    }
    function li(text) {
        var e = document.createElement('li');
        e.appendChild(document.createTextNode(text));
        return e;
    }

    ref[0] = ul();
    counts[0] = 1;

    for (i = 0; i < data.length; ++i) {
        ref[data[i].parentId].appendChild(li(data[i]['name'])); // create <li>
        ref[data[i].id] = ul(); // assume + create <ul>
        ref[data[i].parentId].appendChild(ref[data[i].id]);
        counts[data[i].id] = 0;
        counts[data[i].parentId] += 1;
    }

    for (i in counts) // for every <ul>
        if (counts[i] === 0) // if it never had anything appened to it
            ref[i].parentNode.removeChild(ref[i]); // remove it
    return ref[0];
}

/**
 * Add a marker on map
 *
 * @param float lat
 * @param float lng
 * @param string content
 */
function addMarker(lat, lng, content) {
    let tmpMarker = L.marker([lat, lng])
    .bindPopup( new L.popup({
        minWidth: screen.width / 10,
        closeButton: false
    })
    .setContent(content));
    mapMarkers.push(tmpMarker);
    tmpMarker.addTo(map);
}














/**
 * Initialisation
 */
window.onload = () => {

    // MAP
    map = L.map('map').setView([46.498967, 2.418279], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {})
    .addTo(map);
    for (marker of mapMarkers) {
        marker.addTo(map);
    }
    // CAMERA TO Canvas
    window.requestAnimationFrame(drawCamera);

    // Start to watch GPS position
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition( (pos) => {
            // pos.latitude	The latitude as a decimal number (always returned)
            // pos.longitude	The longitude as a decimal number (always returned)
            // pos.accuracy	The accuracy of position (always returned)
            // pos.altitude	The altitude in meters above the mean sea level (returned if available)
            // pos.altitudeAccuracy	The altitude accuracy of position (returned if available)
            // pos.heading	The heading as degrees clockwise from North (returned if available)
            // pos.speed The speed in meters per second (returned if available)
            //console.log(pos);
            position = pos.coords;
        }, (err) => {
            switch(err.code) {
                case err.PERMISSION_DENIED:
                    console.error("User denied the request for Geolocation.");
                    break;
                case err.POSITION_UNAVAILABLE:
                    console.error("Location information is unavailable.");
                    break;
                case err.TIMEOUT:
                    console.error("The request to get user location timed out.");
                    break;
                case err.UNKNOWN_ERROR:
                    console.error("An unknown error occurred.");
                    break;
            }
        });
    }
    else {
        console.error("Your browser doesn't support this feature");
    }


db.pics.each( (pic) => {
    //addCarousel(pics[i],0);
    //carouselselector.append("<a class='carousel-item'><img src='"+pics[i].url+"'></a>");
    //cardselector.append("<div class='col s6 m3 l3'><div class='card'><div class='card-image'><img src='"+pics[i].url+"'><span class='card-title'>"+pics[i].id+"</span></div></div></div>");
    cardselector.append("<div class='col s6 m3 l3'><div class='card'><div class='card-image waves-effect waves-block waves-light'><img class='activator' src='"+pic.url+"'><span class='card-title'>"+(new Date(pic.id)).toLocaleString(navigator.language)+"</span></div><div class='card-reveal'><span class='card-title grey-text text-darken-4'><i class='material-icons right'>close</i></span><p>Long. : "+pic.gps.long+"</br>Lat. : "+pic.gps.lat+"</p></div></div></div>");
    addMarker(pic.gps.lat, pic.gps.long, `<img src=\"${pic.url}\" />`)
    //pics.push(pics[i]);
      //carouselselector.carousel({indicators:true});

} );

    // SERVICE WORKER
    /*if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            insecure: true
        })
        .then((registration) => {
            console.info('Service Worker Registered');
        });
        navigator.serviceWorker.ready.then((registration) => {
            console.info('Service Worker Ready');
        });
    }*/

    // TRACKING V1

    /*let tracker = new tracking.ObjectTracker(['face']);
    tracker.setInitialScale(1);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);
    tracking.track('#video', tracker, {camera: true});
    tracker.on('track', (e) => {
        //context.clearRect(0, 0, canvas.width, canvas.height);
        e.data.forEach((rect) => {
            /*context.strokeStyle = '#a64ceb';
            context.strokeRect(rect.x, rect.y, rect.width, rect.height);
            context.font = '11px Helvetica';
            context.fillStyle = "#fff";
            context.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
            context.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
            console.log(rect);
        });
    });*/

    // TRACKING V2
}
