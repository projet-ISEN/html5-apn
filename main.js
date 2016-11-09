// Grab elements, create settings, etc.
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let shootButton = document.getElementById("shoot");
let resetButton = document.getElementById("reset");
let saveButton = document.getElementById("save");
let picLong = document.getElementById("picLong");
let picLat = document.getElementById("picLat");
let picAlt = document.getElementById("picAlt");
let picDate = document.getElementById("picDate");
let context = canvas.getContext('2d');
let target = document.getElementById("target");
let targetContext = target.getContext('2d');
let dateField = document.getElementById("infos");
let carouselselector = $(".carousel");
/**
 * GPS position
 */
let position = {};
let map = {};
let mapMarkers = [];

/**
 * Prevent bad things 
 */
video.addEventListener('canplay', (event) => {
    event.preventDefault();
});

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

db.pics.toArray( (pics) => {
    console.log(pics);
    for(i=0;i<pics.length;i++){
       addCarousel(pics[i],0);
        carouselselector.append("<a class='carousel-item'><img src='"+pics[i].url+"'></a>");
        addMarker(pics[i].gps.lat, pics[i].gps.long, `<img src=\"${pics[i].url}\" />`)
        //pics.push(pics[i]);
    }
       $(document).ready(function(){
      $('.carousel').carousel();
    });
} );


/**
 * Request and start Camera 
 */
navigator.getUserMedia({ 
  video: true,
  audio: false 
}, (stream) => {

    streaming = true;
    video.src = URL.createObjectURL(stream);
    targetContext.beginPath();
    targetContext.arc(target.width / 2, target.height / 2, target.width / 8, 0, 2 * Math.PI);
    targetContext.lineWidth = 4;
    targetContext.stroke();

    targetContext.beginPath();
    targetContext.moveTo(target.width / 4, target.height / 2);
    targetContext.lineTo(target.width / 4 + target.width / 2, target.height / 2);
    targetContext.stroke();

    targetContext.beginPath();
    targetContext.moveTo(target.width / 2, target.height / 4);
    targetContext.lineTo(target.width / 2, target.height / 4 + target.height / 2);
    targetContext.stroke();
}, (err) => {
  console.error("Your browser doesn't support this feature", err);
});

/**
 * 
 * @param {any} pic
 * @param {any} left
 */
function addCarousel(pic,left){
    carouselselector.append("<a class='carousel-item'><img src='"+pic.url+"' long='"+pic.gps.long+"' lat='"+pic.gps.lat+"' alt='"+pic.gps.alt+"' date='"+pic.id+"' >");
    if(left){
    $('.carousel').removeClass('initialized');
    $('.carousel').carousel();
    $('.carousel').carousel('prev');
    }
}

/**
 * Trigger photo take
 */
shootButton.addEventListener("click", (e) => {
	
    // Display
    let now = Math.round(Date.now()/1000);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    picLong.innerHTML = position.longitude;
    picLat.innerHTML = position.latitude;
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

    addCarousel(temp,1);
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
 * Trigger photo reset
 */
resetButton.addEventListener('click', (e) => {

    context.clearRect(0, 0, canvas.width, canvas.height);
    picLong.innerHTML = "";
    picLat.innerHTML = "";
    picAlt.innerHTML = "";
    picDate.innerHTML = "";
});

saveButton.addEventListener('click', (e)=> {
    window.open(canvas.toDataURL(), '_TOP');
});

if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (pos) => {
                // pos.latitude	The latitude as a decimal number (always returned)
                // pos.longitude	The longitude as a decimal number (always returned)
                // pos.accuracy	The accuracy of position (always returned)
                // pos.altitude	The altitude in meters above the mean sea level (returned if available)
                // pos.altitudeAccuracy	The altitude accuracy of position (returned if available)
                // pos.heading	The heading as degrees clockwise from North (returned if available)
                // pos.speed The speed in meters per second (returned if available)
                console.log(pos);
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
        //console.log(navigator.geolocation.getCurrentPosition((pos) => {console.log(pos)}, (err) => {console.log(err)}));
} else {
  console.error("Your browser doesn't support this feature");
}

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
 * Initialisation
 */
window.onload = () => {

    // MAP
    map = L.map('map').setView([46.498967, 2.418279], 6);
    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',

    }).addTo(map);
    for (marker of mapMarkers) {
        marker.addTo(map);
    }

    // SERVICE WORKER
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
            console.info('Service Worker Registered');
        });
        navigator.serviceWorker.ready.then((registration) => {
            console.info('Service Worker Ready');
        });
    }
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
