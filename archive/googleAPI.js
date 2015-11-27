var map,
    mapCenter = {lat: 53.339821, lng: -6.2362889999999425},
    markers = [],
    places,
    infowindow,
    bounds,
    styledMap;

var styles = [
  {
    "featureType": "road.local",
    "stylers": [
      { "saturation": 100 },
      { "hue": "#0008ff" }
    ]
  }
]

function initMap() {
  var mapOptions = {
    center: mapCenter,
    zoom: 14,
    minZoom: 3,
    maxZoom: 18,
    disableDefaultUI: true
  };

  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  marker = new google.maps.Marker();
  bounds = new google.maps.LatLngBounds();
  styledMap = new google.maps.StyledMapType(styles,{name: "Styled Map"});
  map.mapTypes.set('map_style', styledMap);
  map.setMapTypeId('map_style');
}

initMap();

function getCurrentLocation() {
  // Locate user
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        mapCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.setCenter(mapCenter);
      }, function() {
        handleLocationError(true, infowindow, map.getCenter());
      });
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infowindow, map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  // Handle geolocation errors
  initNeighbourhood(pos);
  var defaultLocation = '<div><strong>' + "Default Location in case..." + '</strong><br>'
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
      defaultLocation + 'Error: The Geolocation service failed.' :
      defaultLocation + 'Error: Your browser doesn\'t support geolocation.');
}

getCurrentLocation();

function initAutocomplete() {
  // Create the search box and link it to the UI element.
  var input = document.getElementById('search-input');
  var searchBox = new google.maps.places.SearchBox(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];

    // For each place, get the icon, name and location.
    bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      markers.push(new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location
      }));

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
  });
}

initAutocomplete();
