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

/**
 * GPS position
 */
var position = {};

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
    pics: 'id, data, gps'
});

db.open().catch((e) => {
    console.error(e);
    dbOK = false;
});

db.pics.each((pic) => {
    console.log(pic);
    pics.push(pic);
    refreshList();
});

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
 * Trigger photo take
 */
shootButton.addEventListener("click", (e) => {
	
    let now = new Date();
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    picLong.innerHTML = position.longitude;
    picLat.innerHTML = position.latitude;
    picAlt.innerHTML = position.altitude;
    picDate.innerHTML = now;

    console.log(context.getImageData(0, 0, canvas.width, canvas.height));
    // STORE PICS
    db.pics.put({
        id: Date.now(now.getTime()),
        data: context.getImageData(0, 0, canvas.width, canvas.height),
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
refreshList = () => {

}
buildList = (data) => {
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