import React, { Component, useEffect } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lng: props.mapCenter.longitude,
      lat: props.mapCenter.latitude,
      zoom: props.mapCenter.zoom
    };

    this.businessMarkers = [];
  };
  // useEffect({},[this.props.mapCenter.longitude]);

  // https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
  createGeoJSONCircle = (center, radiusInKm, points) => {
    if (!points) points = 64;

    var coords = {
      latitude: center[1],
      longitude: center[0]
    };

    var km = radiusInKm;

    var ret = [];
    var distanceX = km / (111.32 * Math.cos(coords.latitude * Math.PI / 180));
    var distanceY = km / 110.574;

    var theta, x, y;
    for (var i = 0; i < points; i++) {
      theta = i / points * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);

      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [ret]
            }
          }
        ]
      }
    };
  };

  businessPopupHTML = business => {
    return `<ul>
    <li>
      <strong>Name: </strong> ${business.name}
    </li>
    <li>
      <strong>Address: </strong> ${business.address}
    </li>
    <li>
      <strong>Bed Count: </strong> ${business.no_beds}
    </li>
    <li>
      <strong>Category: </strong> ${business.category}
    </li>
    <li>
    <strong>Ambulance No. : </strong> ${business.ambulnumber}
  </li>
  <li>
  <strong>City : </strong> ${business.city}
</li>

    
  </ul>`;
  };

  setBusinessMarkers() {
    const { businesses } = this.props;
    this.businessMarkers.map(m => {
      m.remove();
      return true;
    });

    // this.businessMarkers = businesses.map(b => {
    //   return new mapboxgl.Marker()
    //     .setLngLat([b.location.x, b.location.y])
    //     .setPopup(
    //       new mapboxgl.Popup({ offset: 25 }).setHTML(this.businessPopupHTML(b))
    //     )
    //     .addTo(this.map);
    // });
    this.businessMarkers = businesses.map(b => {
      console.log("latitude: "+b['latitude'] + typeof(b['longitude']))
      return new mapboxgl.Marker()
        .setLngLat( [b['longitude'],b['latitude']])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(this.businessPopupHTML(b))
        )
        .addTo(this.map);
    });
  }

  componentDidUpdate() {
    this.setBusinessMarkers();
    
    if (this.mapLoaded) {
    const { lng, lat, zoom } = this.state;

      this.map.flyTo({
        center: [
          this.props.mapCenter.longitude, this.props.mapCenter.latitude
        ],
        // zoom: this.props.mapCenter.zoom,
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
        })
        .getSource("polygon")
        .setData(
          this.createGeoJSONCircle(
            [this.props.mapCenter.longitude, this.props.mapCenter.latitude],
            this.props.mapCenter.radius
          ).data
        );
        this.marker.setLngLat([
          this.props.mapCenter.longitude, this.props.mapCenter.latitude
        ]);
    }
  }

  componentDidMount() {
    const { lng, lat, zoom } = this.state;

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/streets-v9",
      center: [lng, lat],
      zoom
    });

    this.map.on("load", () => {
      this.mapLoaded = true;
      this.map.addSource(
        "polygon",
        this.createGeoJSONCircle([lng, lat], this.props.mapCenter.radius)
      );
      this.map.addLayer({
        id: "polygon",
        type: "fill",
        source: "polygon",
        layout: {},
        paint: {
          "fill-color": "blue",
          "fill-opacity": 0.2
        }
      });
    });

    const onDragEnd = e => {
      var lngLat = e.target.getLngLat();

      const viewport = {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
        zoom: this.map.getZoom()
      };
      this.props.mapSearchPointChange(viewport);

      this.map
        .getSource("polygon")
        .setData(
          this.createGeoJSONCircle(
            [lngLat.lng, lngLat.lat],
            this.props.mapCenter.radius
          ).data
        );
    };

    this.marker = new mapboxgl.Marker({ color: "red", zIndexOffset: 9999 })
      .setLngLat([lng, lat])
      .addTo(this.map)
      .setPopup(
        new mapboxgl.Popup().setText(
          "Drag Me to search for Hospitals!"
        )
      )
      .setDraggable(true)
      .on("dragend", onDragEnd)
      .addTo(this.map)
      .togglePopup();

    this.map.on("move", () => {
      const { lng, lat } = this.map.getCenter();

      this.setState({
        lng: lng,
        lat: lat,
        zoom: this.map.getZoom().toFixed(2)
      });
    });

    this.setBusinessMarkers();
  }

  render() {
    return (
      <div>
        <div
          ref={el => (this.mapContainer = el)}
          className="absolute top right left bottom"
        />
      </div>
    );
  }
}

export default Map;
