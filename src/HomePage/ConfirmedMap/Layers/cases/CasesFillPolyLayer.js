/**
This file is licensed under the MIT license

Copyright (c) 2020 David Morrissey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import CasesPopup from "./CasesPopup";


class CasesFillPolyLayer {
    /**
     * A transparent fill poly layer for
     * cases to allow for popup on click events
     *
     * @param map a MapBox GL instance
     * @param uniqueId a unique ID for the MapBox GL layer
     * @param mapBoxSource a MapBoxSource instance
     */
    constructor(map, uniqueId, mapBoxSource) {
        this.map = map;
        this.uniqueId = uniqueId;
        this.mapBoxSource = mapBoxSource;
    }

    /*******************************************************************
     * Fill poly
     *******************************************************************/

    /**
     * Add the (transparent) fill poly layer for
     * cases to allow for popup on click events
     */
    addLayer() {
        this.removeLayer();

        // Add the colored fill area
        const map = this.map;

        // Make it so that symbol/circle layers are given different priorities
        // This is a temporary fix to make ACT display in the correct priority -
        // see also LayerHeatMap.js for an explanation.
        var lastFillLayer;
        var layers = map.getStyle().layers;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'fill' && layers[i].id.indexOf('fillpoly') !== -1) {
                lastFillLayer = layers[i].id;
            }
        }

        map.addLayer(
            {
                id: this.uniqueId+'fillpoly',
                type: 'fill',
                source: this.mapBoxSource.getSourceId(),
                paint: {
                    'fill-opacity': 0.0
                }
            },
            lastFillLayer
        );

        this.__casesPopup = new CasesPopup(map, this.uniqueId + 'fillpoly', null, null); // FIXME!!!! ==================================================
        this.__shown = true;
    }

    /**
     * Remove the fill poly layer
     */
    removeLayer() {
        if (this.__shown) {
            const map = this.map;
            map.removeLayer(this.uniqueId + 'fillpoly');

            if (this.__casesPopup) {
                this.__casesPopup.disablePopups();
                this.__casesPopup = null;
            }
            this.__shown = false;
        }
    }
}

export default CasesFillPolyLayer;
