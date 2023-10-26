// Get url parameters
var params = {};
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (
    m,
    key,
    value
) {
    params[key] = value;
});

if (params.layers) {
    var activeLayers = params.layers.split(",").map(function (item) {
        // map function not supported in IE < 9
        return layers[item];
    });
}

var map_base = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    // tileSize: 512,
    // zoomOffset: -1
})

var goes16c = L.tileLayer('https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=goes-cmi&item=OR_ABI-L2-C-M6_G16_s20231581856181&asset_as_band=true&color_formula=Gamma+RGB+2.5+Saturation+1.4+Sigmoidal+RGB+2+0.7&expression=C02_2km_wm%3B0.45%2AC02_2km_wm%2B0.1%2AC03_2km_wm%2B0.45%2AC01_2km_wm%3BC01_2km_wm&nodata=-1&rescale=1%2C2000&collection=goes-cmi&format=png', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    // tileSize: 512,
    // zoomOffset: -1
})

var map_names = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

// Create map
var map = L.map('map', {
    center: [params.lat || 37.14, params.lng || -98.75],
    zoom: params.zoom || 5,
    layers: [map_base, map_names]
});
// map.addLayer(map_base);
// map.addLayer(map_names);

// get color depending on population Temp value
function getColor(d) {
    return d > 1400 ? '#ffffff' :
        d > 1300 ? '#ffffcc' :
            d > 1200 ? '#ffff66' :
                d > 1100 ? '#feec02' :
                    d > 1000 ? '#ff9900' :
                        d > 800 ? '#ff6600' :
                            d > 500 ? '#f20000' :
                                d > 200 ? '#b40000' :
                                    d > 1 ? '#700000' :
                                        '#6d6d6d';
}

function style(feature) {
    return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        // fillColor: getColor(feature.properties['Temp_b']),
        fillColor: "#ff6347",
        radius: 10,
    };
}


function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    // info.update(layer.feature.properties);
}

var goes16fires;
// function resetHighlight(e) {
//     goes16fires.resetStyle(e.target);
//     // info.update();
// }
// var goes16smoke;
// function resetHighlight(e) {
//     goes16smoke.resetStyle(e.target);
//     // info.update();
// }
// var goes16dust;
// function resetHighlight(e) {
//     goes16dust.resetStyle(e.target);
//     // info.update();
// }
// specify popup options
var customOptions = {
    'maxWidth': '300',
    'className': 'custom'
}

function customPopup5(feature, layer) {
    var charopt = {
        title: { text: '' },
        subtitle: { text: '' },
        xAxis: {
            type: 'datetime',
            labels: {
                overflow: 'justify'
            },
            dateTimeLabelFormats: {
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%e. %b',
                week: '%e. %b',
                month: '%b \'%y',
                year: '%Y'
            },
        },
        yAxis: { title: { text: 'Temperatura°C' } },
        legend: { enabled: false, },
        plotOptions: {
            series: {
                pointInterval: 300000, // five minutes
                pointStart: Date.parse(feature.properties['time_0']),
            }
        },
        credits: {
            enabled: false,
            href: 'https://goesrdatajam.sched.com/',
            text: 'GOESR',
        },
        exporting: { enabled: false },
        series: [{
            name: 'Temperatura',
            data: feature.properties['serie']
        }]
    };

    var popupContent = '<div class="container">  \
            <h3>Situación: ' + feature.properties['Status'] + '</h3>  \
            <h3>Temperatura: ' + feature.properties['data'] + '°C' + '</h3>  \
            <h3>Ultima actividad hace: ' + feature.properties['time_o'] + ' hrs</h3>  \
            <h3>Ubicación: ' + feature.properties['lon'] + ', ' + feature.properties['lat'] + '</h3>  \
            <p style="font-size:130%;"><b>' + '' + '</b></p><div id="container" style="width: 300px; height: 200px; ">Loading...</div>\
            </div>';
    layer.on({
        // mouseover: highlightFeature,
        // mouseout: resetHighlight,
        popupopen: function (e) {
            var chart = new Highcharts.chart('container', charopt);
        }
    });
    layer.bindPopup(popupContent);
}

function customPopup10(feature, layer) {
    var charopt = {
        title: { text: '' },
        subtitle: { text: '' },
        xAxis: {
            type: 'datetime',
            labels: {
                overflow: 'justify'
            },
            dateTimeLabelFormats: {
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%e. %b',
                week: '%e. %b',
                month: '%b \'%y',
                year: '%Y'
            },
        },
        yAxis: { title: { text: 'Temperatura°C' } },
        legend: { enabled: false, },
        plotOptions: {
            series: {
                pointInterval: 600000, // five minutes
                pointStart: Date.parse(feature.properties['time_0']),
            }
        },
        credits: {
            enabled: false,
            href: 'https://goesrdatajam.sched.com/',
            text: 'GOESR',
        },
        exporting: { enabled: false },
        series: [{
            name: 'Temperatura',
            data: feature.properties['serie']
        }]
    };

    var popupContent = '<div class="container">  \
            <h3>Status: ' + feature.properties['Status'] + '</h3>  \
            <h3>Temperature: ' + feature.properties['data'] + '°C' + '</h3>  \
            <h3>Last activitie: ' + feature.properties['time_o'] + ' hrs</h3>  \
            <h3>Location: ' + feature.properties['lon'] + ', ' + feature.properties['lat'] + '</h3>  \
            <p style="font-size:130%;"><b>' + '' + '</b></p><div id="container" style="width: 300px; height: 200px; ">Loading...</div>\
            </div>';
    layer.on({
        // mouseover: highlightFeature,
        // mouseout: resetHighlight,
        popupopen: function (e) {
            var chart = new Highcharts.chart('container', charopt);
        }
    });
    layer.bindPopup(popupContent);
}
// Vector Layers

var goes16fires = new L.GeoJSON.AJAX("data_map/exp_01/pts_fdc.geojson", {
    style: {
        weight: 2,
        opacity: 1,
        color: "#ff6347",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#ff6347",
        radius: 10,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup5,
})
map.addLayer(goes16fires);
// .addTo(map)
var goes16smoke = new L.GeoJSON.AJAX("data_map/exp_01/pts_adpS.geojson", {
    style: {
        weight: 2,
        opacity: 1,
        color: "#808080",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#808080",
        radius: 5,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup5,
})
// .addTo(map)
var goes16dust = new L.GeoJSON.AJAX("data_map/exp_01/pts_adpD.geojson", {
    style: {
        weight: 2,
        opacity: 1,
        color: "#ffa500",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#ffa500",
        radius: 5,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup5,
})
// .addTo(map)
var goes16prec = new L.GeoJSON.AJAX("data_map/exp_01/pts_rrqpef.geojson", {
    style: {
        weight: 2,
        opacity: 1,
        color: "#1e90ff",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#1e90ff",
        radius: 5,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup10,
})
// .addTo(map)
map.attributionControl.addAttribution('GOES-R &copy; <a href="https://goesrdatajam.sched.com/">goesrdatajam</a>');

var legend = L.control({ position: 'bottomright' });


var baseMaps = {

};

var overlayMaps = {
    "Fire": goes16fires,
    "Smoke": goes16smoke,
    "Dust": goes16dust,
    "Precip": goes16prec,
    "TrueColor": goes16c,
};
L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);


// legend.onAdd = function (map) {

//     var div = L.DomUtil.create('div', 'info legend'),
//         grades = [0, 1, 200, 500, 800, 1000, 1100, 1200, 1300, 1400,],
//         labels = [],
//         from, to;

//     for (var i = 0; i < grades.length; i++) {
//         from = grades[i];
//         to = grades[i + 1];

//         labels.push(
//             '<i style="background:' + getColor(from + 1) + '"></i> ' +
//             from + (to ? '&ndash;' + to : '+'));
//     }

//     div.innerHTML = labels.join('<br>');
//     return div;
// };

// legend.addTo(map);
// Wathermark
// https://stackoverflow.com/questions/16563190/how-to-add-a-non-referenced-image-as-overlay-in-leaflet
var mainlogo = L.control({
    position: 'bottomleft'
});
mainlogo.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'logo watermark');
    div.innerHTML = '<img id= "logo" src="imgs/sched-web-footer_128.png" >';
    return div;
};
mainlogo.addTo(map);