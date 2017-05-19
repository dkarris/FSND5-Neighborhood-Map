// var map;
//     function initMap() {
//         map = new google.maps.Map(document.getElementById('map'), {
//             center: {lat: - 34.397, lng: 150.1644},
//             zoom: 8
//         });
//     }

var map;
console.log('loading google_maps ');
function initMap() {
// Constructor creates a new map - only center and zoom are required.
    console.log(google);
    map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 40.7413549, lng: -73.9980244},
    zoom: 13
    });
    var tribeca = {lat: 40.719526, lng: -74.0089934};
    var marker = new google.maps.Marker({
        position: tribeca,
        map: map,
        title: 'My first marker!'
    });
}