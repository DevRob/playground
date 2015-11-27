$(function() {

  var data = {
    userLocation: [37.4184, 22.0880],
    targetLocation: {},
    targetRadius: 1000,
    TypeOfInterest: ['food', 'service', 'libraries']
  };

  var coordinator = {
    getUserLocation: function() {
      var startPos;
      var geoOptions = {
         timeout: 10 * 1000
      };
      var geoSuccess = function(position) {
        var pos = [position.coords.latitude, position.coords.longitude];
        view.initMap(pos);
      };
      var geoError = function(error) {
        alert('Error occurred. Error code: ' + error.code);
        // error.code can be:
        //   0: unknown error
        //   1: permission denied
        //   2: position unavailable (error response from location provider)
        //   3: timed out
      };
      navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
    }
  };

  view = {
    initMap : function(pos) {
      var pyrmont = new google.maps.LatLng(pos[0], pos[1]);

      var map = new google.maps.Map(document.getElementById('map-canvas'), {
        center: pyrmont,
        zoom: 17,
        maxZoom: 16,
        minZoom: 3
      });

      var request = {
        location: pyrmont,
        radius: 1000,
        types: ['store']
      };

      placesList = document.getElementById('places');

      var service = new google.maps.places.PlacesService(map);
      service.nearbySearch(request, callback);

      function callback(results, status, pagination) {
        if (status != google.maps.places.PlacesServiceStatus.OK) {
          return;
        } else {
          createMarkers(results);

          if (pagination.hasNextPage) {
            var moreButton = document.getElementById('more');

            moreButton.disabled = false;

            google.maps.event.addDomListenerOnce(moreButton, 'click',
                function() {
              moreButton.disabled = true;
              pagination.nextPage();
            });
          }
        }
      }

      function createMarkers(places) {
        var bounds = new google.maps.LatLngBounds();

        for (var i = 0, place; place = places[i]; i++) {
          var image = {
            url: place.icon,
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25)
          };

          var marker = new google.maps.Marker({
            map: map,
            icon: image,
            title: place.name,
            position: place.geometry.location
          });

          placesList.innerHTML += '<li>' + place.name + '</li>';

          bounds.extend(place.geometry.location);
        }
        map.fitBounds(bounds);
      }

      // Create the search box and link it to the UI element.
      var input = /** @type {HTMLInputElement} */(
          document.getElementById('pac-input'));
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

      var searchBox = new google.maps.places.SearchBox(
        /** @type {HTMLInputElement} */(input));

      // Listen for the event fired when the user selects an item from the
      // pick list. Retrieve the matching places for that item.
      google.maps.event.addListener(searchBox, 'places_changed', function() {
        var places = searchBox.getPlaces();

        if (places.length == 0) {
          return;
        }
        for (var i = 0, marker; marker = markers[i]; i++) {
          marker.setMap(null);
        }
        // For each place, get the icon, place name, and location.
        markers = [];
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0, place; place = places[i]; i++) {
          var image = {
            url: place.icon,
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25)
          };

          var marker = new google.maps.Marker({
            map: map,
            icon: image,
            title: place.name,
            position: place.geometry.location
          });

          markers.push(marker);

          bounds.extend(place.geometry.location);
        }

        map.fitBounds(bounds);
      });

      // Bias the SearchBox results towards places that are within the bounds of the
      // current map's viewport.
      google.maps.event.addListener(map, 'bounds_changed', function() {
        var bounds = map.getBounds();
        searchBox.setBounds(bounds);
      });
    } // close initMap
  }; // close view
  coordinator.getUserLocation();
});

//---------------------------------------------------------------------------------------------------------------------------
