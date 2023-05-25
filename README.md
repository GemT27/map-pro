### [demo](https://gemt27.github.io/map-pro/index.html)

## 安装

```bash
$ npm install map-pro
```

## 使用

```js
import mapPro from 'map-pro';

let full
let border
await fetch("https://geo.datav.aliyun.com/areas_v3/bound/geojson?code=110000_full")
    .then(r => r.json())
    .then(r => full = r)

await fetch("https://geo.datav.aliyun.com/areas_v3/bound/geojson?code=110000")
    .then(r => r.json())
    .then(r => border = r)

const cfg = {
    echarts: echarts,
    width: 500,
    height: 500,
    geoJson: {
        border: border,
        full: full,
        mapName: "北京市",
    },
    animate: {
        show: true,
        constantSpeed: 150,
        trailLength: 0.8,
        symbolSize: 4,
        delay: 500,
        color: "rgba(255,255,255,0.8)",
    },
};
const {mapSvg, shapesList, geoUtils, cityList} = mapPro(cfg);
echarts.registerMap("北京市", {svg: mapSvg});
```
