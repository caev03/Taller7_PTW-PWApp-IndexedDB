// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var url = "http://" + document.location.host + document.location.pathname;

(function() {
  'use strict';

  var hayIndexedDB = false;
  var db;
  var objectStore;

  if(!window.indexedDB){
    window.alert("Your browser doesn't support a stable database.")
  } else {
    var request = window.indexedDB.open("MyTestDatabase", 3);
    request.onerror = function(event){
      window.alert("Fallo la conexión a IndexedDB.")
    } 
    request.onsuccess = function(event){
      
      hayIndexedDB = true;
      db = event.target.result;
      console.log("Welcome to IndexedDB.")
      objectStore = db.createObjectStore("FlightDB",{keyPath: "flightid"});

      objectStore.createIndex("endTime", "endTime", { unique: false });
      objectStore.createIndex("estado", "estado", { unique: false });
      objectStore.createIndex("ciudad", "ciudad", { unique: false });
    }
    request.onupgradeneeded = function(event) {
      db = event.target.result;
      console.log("asdasdasd");
      
    }
  }
  
  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    if (!app.selectedCities) {
      app.selectedCities = [];
    }
    app.getForecast(key, label);
    app.selectedCities.push({key: key, label: label});
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    var dataLastUpdated = new Date(data.created);
    var myData = data.data;

    var card = app.visibleCards[data.key];
    console.log(data.label);
    console.log(data.key);
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;

    card.querySelector('.description').textContent = 'Disponible';
    card.querySelector('.date').textContent = data.created;

    var flights = myData;

    //$("#tableFlights tbody > tr").remove();

    card.querySelector('.table-striped .table .tbody').textContent="";

    var txt = "";
    if(objectStore != null){
      console.log("asdasdasd");
      objectStore.transaction.oncomplete = function(event) {
    // Store values in the newly created objectStore.
      if(db!=null){
        var customerObjectStore = db.transaction("FlightDB", "readwrite").objectStore("FlightDB");
      }
      for (var i in flights) {
        var aaa = flights[i];
        aaa.ciudad = data.label;
        customerObjectStore.add(aaa);
      }
    };
    }
    
    for(var i = 0; i < flights.length; i++){
      var actualFlight = flights[i];
      var id = actualFlight.flightid;
      var horario = new Date(actualFlight.endTime);
      var horarioString = horario.getDate() + "/" + (horario.getMonth()+1) + "/" + horario.getFullYear();
      var estado = actualFlight.estado;
      var parenttbl = document.getElementsByTagName("tr");
      var tr = document.createElement('tr');

      var td = document.createElement('td');
      td.innerHTML = (i+1);
      tr.appendChild(td);

      var td2 = document.createElement('td');
      td2.innerHTML = id;
      tr.appendChild(td2);

      var td3 = document.createElement('td');
      td3.innerHTML = horarioString;
      tr.appendChild(td3);

      var td4 = document.createElement('td');
      td4.innerHTML = estado;
      tr.appendChild(td4);

      card.querySelector('.table-striped .table .tbody').appendChild(tr);
      //$("#tableFlights tbody").append('<tr><td>' + (i+1) + '</td><td>' + id + '</td><td>' + horarioString + '</td><td>' + estado + '</td></tr>');
    }


    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getForecast() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getForecast() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getForecast = function(key, label) {
    var url = 'https://apitallerweb.herokuapp.com/';
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
       // CAMBIOS - se obtiene los datos de los vuelos
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function updateFromCache(json) {
            var results = {
              key: key,
              label: label,
              created: new Date(),
              data: json

            }
            console.log(json);
            app.updateForecastCard(results);
          });
        }
      });
    }

    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          var results = {
            key: key,
            label: label,
            created: new Date(),
            data: response
          }
          app.updateForecastCard(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateForecastCard(initialWeatherForecast);
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // Save list of cities to localStorage.
  app.saveSelectedCities = function() {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };

  app.getIconClass = function(weatherCode) {
    // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
    weatherCode = parseInt(weatherCode);
    switch (weatherCode) {
      case 25: // cold
      case 32: // sunny
      case 33: // fair (night)
      case 34: // fair (day)
      case 36: // hot
      case 3200: // not available
        return 'clear-day';
      case 0: // tornado
      case 1: // tropical storm
      case 2: // hurricane
      case 6: // mixed rain and sleet
      case 8: // freezing drizzle
      case 9: // drizzle
      case 10: // freezing rain
      case 11: // showers
      case 12: // showers
      case 17: // hail
      case 35: // mixed rain and hail
      case 40: // scattered showers
        return 'rain';
      case 3: // severe thunderstorms
      case 4: // thunderstorms
      case 37: // isolated thunderstorms
      case 38: // scattered thunderstorms
      case 39: // scattered thunderstorms (not a typo)
      case 45: // thundershowers
      case 47: // isolated thundershowers
        return 'thunderstorms';
      case 5: // mixed rain and snow
      case 7: // mixed snow and sleet
      case 13: // snow flurries
      case 14: // light snow showers
      case 16: // snow
      case 18: // sleet
      case 41: // heavy snow
      case 42: // scattered snow showers
      case 43: // heavy snow
      case 46: // snow showers
        return 'snow';
      case 15: // blowing snow
      case 19: // dust
      case 20: // foggy
      case 21: // haze
      case 22: // smoky
        return 'fog';
      case 24: // windy
      case 23: // blustery
        return 'windy';
      case 26: // cloudy
      case 27: // mostly cloudy (night)
      case 28: // mostly cloudy (day)
      case 31: // clear (night)
        return 'cloudy';
      case 29: // partly cloudy (night)
      case 30: // partly cloudy (day)
      case 44: // partly cloudy
        return 'partly-cloudy-day';
    }
  };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialWeatherForecast = {
    key: '2459115',
    label: 'New York, NY',
    created: '2016-07-22T01:00:00Z',
    data: [
      {
          "endTime": 1477161335327,
          "estado": "En camino",
          "flightid": "687",
          "ciudad":"New York, NY"
      },
      {
          "endTime": 1477161192327,
          "estado": "Despegando",
          "flightid": "143",
          "ciudad":"New York, NY"
      },
      {
          "endTime": 1477160431327,
          "estado": "En camino",
          "flightid": "452",
          "ciudad":"New York, NY"
      },
      {
          "endTime": 1477160750327,
          "estado": "Programado",
          "flightid": "195",
          "ciudad":"New York, NY"
      },
      {
          "endTime": 1477159035327,
          "estado": "Programado",
          "flightid": "575",
          "ciudad":"New York, NY"
      }
    ]
  };
  // TODO uncomment line below to test app with fake data
  //app.updateForecastCard(initialWeatherForecast);

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  // TODO add startup code here
  app.selectedCities = localStorage.selectedCities;
  if (app.selectedCities) {
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(function(city) {
      app.getForecast(city.key, city.label);
    });
  } else {
    /* The user is using the app for the first time, or the user has not
     * saved any cities, so show the user some fake data. A real app in this
     * scenario could guess the user's location via IP lookup and then inject
     * that data into the page.
     */
    app.updateForecastCard(initialWeatherForecast);
    app.selectedCities = [
      {key: initialWeatherForecast.key, label: initialWeatherForecast.label}
    ];
    app.saveSelectedCities();
  }

  // TODO add service worker code here
  if ('serviceWorker' in navigator) {
    console.log(url);
    navigator.serviceWorker
             .register('/service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();
