/* eslint-disable*/
export const displayMap = locations => {
    mapboxgl.accessToken =
        'pk.eyJ1IjoicmFpc2Fuam9vMyIsImEiOiJjazUyMW00eGgwemxoM25wN3Vsa2gzdG44In0.CMKYBMLmyvcNx1nDJq3PEw';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/raisanjoo3/ck522fdux43is1coy1dzllbd7',
        scrollZoom: false
        // center: [78.448077, 24.652807],
        // trackResize: true,
        // zoom: 10
    });

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(loc => {
        // create Marker
        const el = document.createElement('div');
        el.className = 'marker';

        // Add Marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
            .setLngLat(loc.coordinates)
            .addTo(map);

        // Add Popup
        new mapboxgl.Popup({
            offset: 30
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);
        // Extend map bounds to include current Location
        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
        }
    });
};
