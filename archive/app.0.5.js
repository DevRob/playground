"use strict";
$(function() {

  function nhViewModel() {
    // viewModel for knockout.js
    var self = this,
        map,
        infowindow,
        mapBounds,
        mapCenter = {lat: 53.339821, lng: -6.2362889999999425}, // default map center
        categories = [],
        styledMap,
        today = new Date();

    self.nearByPlaces = ko.observableArray([]);
    self.places = ko.observableArray([]); //container for nearby places objects
    self.markers = ko.observableArray([]); //container for marker objects
    self.radius = ko.observable(2000); //neighborhood radius
    self.keyword = ko.observable('');
    self.switchInfoBox = ko.observable(true);
    self.listBoolean = ko.observable(true);
    self.placePhotos = ko.observableArray([]);

    self.rateImg = function(place) {
      var rating = Math.round(place.rating * 2)/2;
      var imgHolder = [];

      for (var i = 0; i < parseInt(rating); i++) {
        imgHolder.push({"star" : "images/full-star.png"});
      }

      if (rating - parseInt(rating) != 0) {
        imgHolder.push({"star" : "images/half-star.png"});
      }

      for (var i = 0; i < parseInt(5 - rating); i++){
        imgHolder.push({"star" : "images/empty-star.png"});
      }
      return imgHolder;
    }

    self.icons = ko.computed(function() {
      var iconSet = new Set();
      var iconDict = [];
      for (var idx in self.nearByPlaces()) {
        iconSet.add(self.nearByPlaces()[idx].icon);
      }
      iconSet.forEach(function(icon) {
        iconDict.push({"icon": icon});
      })
      return iconDict;
    });

    self.displayedPlaces = function() {
      var places = [];
      var keyword = self.keyword().toLowerCase();
      var actualPlaces = [];

      if (self.places().length < 2) {
        actualPlaces = self.nearByPlaces();
      } else {
        actualPlaces = self.places();
      }

      if (self.keyword() != "") {
        for (var idx in actualPlaces) {

          if (actualPlaces[idx].name.toLowerCase().indexOf(keyword) != -1 ||
              actualPlaces[idx].types[0].toLowerCase().indexOf(keyword) != -1) {
                places.push(actualPlaces[idx]);
          }
        }
      } else {places = actualPlaces;}
      return places;
    }

    self.formattedType = function(data) {
      var formattedType = data.types[0].replace(/[_-]/g, " ");
      return formattedType.charAt(0).toUpperCase() + formattedType.substr(1, formattedType.length);
    }

    var styles = [
    /*{
      "featureType": "poi.park",
      "stylers": [
        { "gamma": 0.91 },
        { "saturation": 18 },
        { "lightness": -33 },
        { "hue": "#22ff00" }
      ]
    },{
      "featureType": "poi.business",
      "stylers": [
        { "gamma": 0.71 },
        { "saturation": 28 },
        { "lightness": -13 },
        { "hue": "#1900ff" }
      ]
    },{
      "featureType": "poi.medical",
      "stylers": [
        { "hue": "#ff0011" },
        { "saturation": 45 },
        { "lightness": -41 },
        { "gamma": 0.9 }
      ]
    },{
      "featureType": "poi.school",
      "stylers": [
        { "lightness": -16 },
        { "hue": "#ffb300" },
        { "gamma": 0.64 },
        { "saturation": 50 }
      ]
    },{
      "featureType": "poi.sports_complex",
      "stylers": [
        { "hue": "#0800ff" },
        { "gamma": 0.41 },
        { "lightness": -49 }
      ]
    }*/
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
      infowindow = new google.maps.InfoWindow({
        pixelOffset: new google.maps.Size(-23, -10),
      });
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
            getNearbyPlaces(mapCenter);
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
      getNearbyPlaces(mapCenter);
    }

    getCurrentLocation();

    function getNearbyPlaces(center) {
      self.nearByPlaces([]);

      var service = new google.maps.places.PlacesService(map);
        service.nearbySearch  ({
        location: center,
        radius: self.radius(),
        types: categories
      }, processResults);
    }

    function processResults(results, status, pagination) {
      var bounds = new google.maps.LatLngBounds();
      var placesList = document.getElementById('places');
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        return;
      } else {
          for (var i = 0, place; place = results[i]; i++) {
            if (place.types[place.types.length - 1] != "political") {
              self.nearByPlaces.push(place);
              bounds.extend(place.geometry.location);
            }
          }
        addMarkers(self.nearByPlaces());
        map.fitBounds(bounds);
      }
      categories = [];
    }

    function initAutocomplete() {
      self.places([]);
      // Create the search box and link it to the UI element.
      var input = document.getElementById('search-input');
      var searchBox = new google.maps.places.SearchBox(input);

      // Bias the SearchBox results towards current map's viewport.
      map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
        mapCenter = map.getCenter();
      });

      // Listen for the event fired when the user selects a prediction and retrieve
      // more details for that place.
      searchBox.addListener('places_changed', function() {
        var searchedPlaces = searchBox.getPlaces();
        self.places(searchedPlaces);

        if (self.places().length == 0) {
          return;
        }
        else if (self.places().length == 1) {
          getNearbyPlaces(self.places()[0].geometry.location);

          var service = new google.maps.places.PlacesService(map);
          service.getDetails({
            placeId: self.places()[0].place_id
          }, function (place, status) {
            self.nearByPlaces().push(place);
          }
        }
        else {
          addMarkers(self.places());
        }
      });
      categories = [];
    }

    initAutocomplete();

    function addMarkers(places) {
      document.getElementById('search-input').value = "";
      self.keyword("");
      // Clear out the old markers.
      self.markers().forEach(function(marker) {
        marker.setMap(null);
      });
      self.markers([]);

      // For each place, get the icon, name and location.
      mapBounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        var icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        // Create a marker for each place.
        var marker = new google.maps.Marker({
          map: map,
          icon: icon,
          title: place.name,
          animation: google.maps.Animation.DROP,
          position: place.geometry.location
        });

        marker.addListener('click', function() {
          self.markers().forEach(function(marker) {
            marker.setAnimation(null);
          });

          if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
          } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
          }
        });

        self.markers().push(marker);

        google.maps.event.addListener(marker, 'click', function() {
          addInfowindow(place, marker);
          //map.setZoom(15);
        });

        if (place.geometry.viewport) {
          // Only geocodes have viewport.
          mapBounds.union(place.geometry.viewport);
        } else {
          mapBounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(mapBounds);
    }

    function addInfowindow(place, marker) {
      var service = new google.maps.places.PlacesService(map);
      service.getDetails({
        placeId: place.place_id
      }, function (place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          infowindow.setContent(
            '<div style="width: 200px;" class="longtext"><strong>' + place.name + '</strong>' +
            '<hr>' +
            '<span>' + place.formatted_address + '</span>' +
            '<br>' +
            '<span style="color: #4a81ab;">' + getOpeningHrs(place)  + '</span>'+
            '<br><br>' +
            '<div style="white-space: normal; max-height: 150; overflow-y: scroll;"><span>' + getReview(place) + '</span></div>' +
            '<br>' +
            getRating(place) +
            '<br>' +
            '<span id="infoLink">' + getPhone(place) + '</span>' +
            '<br>' +
            '<div class="longtext"><a href="'+ getWeb(place) +'" target="_blank">' + getWeb(place) + '<a></div>' +
            getPhotoes(place) + '</div>'
          );
          infowindow.open(map, marker);
          document.getElementById('infoLink').addEventListener("click", function(){
              map.setZoom(18);
              map.panTo(marker.position);
          });
          document.getElementById('photoLink').addEventListener("click", function(){
            $('#photoViewer').show();
            $('#close').click(function() {
              $('#photoViewer').hide();
            });
          });

          self.placePhotos(place.photos);

          map.panTo(marker.position);
        }
      });
      google.maps.event.addListener(infowindow,'closeclick',function(){
        self.markers().forEach(function(marker) {
          marker.setAnimation(null);
        });
      });
    }

    function getOpeningHrs(place) {
      if (place.opening_hours) {
        return place.opening_hours.weekday_text[today.getDay() - 1  ];
      } else {
        return "";
      }
    }

    function getReview(place) {
      if (place.reviews) {
        return place.reviews[0].text;
      } else {
        return "";
      }
    }

    function getRating(place) {
      var ratingTag = "";
      var starHolder = self.rateImg(place);
      if (place.rating) {
        ratingTag = '<div><span style="color: #df6d15; padding-right: 3px;">' + place.rating + '</span>'
        for (var i in starHolder) {
          ratingTag += '<img class="rate-star" src="' + starHolder[i].star + '" />'
        }

        return ratingTag + '</div>';
      } else {
        return '<span style="font-style: italic;">no rating available</span>';
      }
    }

    function getPhone(place) {
      if (place.international_phone_number) {
        return place.international_phone_number;
      } else {
        return '<a href="#">' + place.geometry.location + '<a>';
      }
    }

    function getWeb(place) {
      if (place.website) {
        return place.website;
      } else {
        return "";
      }
    }

    function getPhotoes(place) {
      if (place.photos) {
        if (place.photos.length > 1 ) {
        return '<a id="photoLink" href="#"">photos<a>';
      }}
      return '<div id="photoLink"></div>';
    }

    // trigger click event to markers when list item is clicked
    self.clickMarker = function(place) {
      var name = place.name.toLowerCase();
      self.markers().forEach(function(marker) {
        if (marker.title.toLowerCase() === name) {
          google.maps.event.trigger(marker, 'click');
          map.panTo(marker.position);
        }
      });
    }

    $('#filters').on('click', 'button', function () {
       //var self = $(this);
       var fileName = $(this).children('img').attr('src').split("/");
       var rawCategory = fileName[fileName.length - 1].split("-")[0];
       categories = [];
       //console.log("raw: ",rawCategory);

       if (rawCategory == "fitness") {
         categories.push("gym");
       }

       for (var idx in googlePlaceTypes) {
         if (googlePlaceTypes[idx].toLowerCase().indexOf(rawCategory.substring(0, 4)) != -1) {
               categories.push(googlePlaceTypes[idx]);
         }
       }
       //console.log("actual: ", categories);
       getNearbyPlaces(map.getCenter());
      });

    $('#reset').on('click', function() {
      categories = [];
      getNearbyPlaces(map.getCenter());
    })

    function getRatingImg() {

    }
  }

  ko.applyBindings(new nhViewModel());

  $('[group~=controls]').show(1000);
  $('#hide').click(function() {
      var glyph = '', currentGlyph = $(this).children('span').attr('class');
      if (currentGlyph.slice(29) === 'left') {
        glyph = currentGlyph.replace('left', 'right')
      }
      else {
        glyph = currentGlyph.replace('right', 'left')
      }

      $(this).siblings('div').animate({width: "toggle"}, 500);
      $(this).children('span').attr('class', glyph);
    });
});
