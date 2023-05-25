import {parseSvg, vNodeToString, parseColor} from "./svgUtils";
import {GeoJSON} from "echarts/types/src/coord/geo/geoTypes";
import {ItemStyleOption} from "echarts/types/src/util/types";
import {CoordinateSystem} from "echarts/types/src/coord/CoordinateSystem";
import {CustomTextOption} from "echarts/types/src/chart/custom/CustomSeries";
import {EChartsType} from "echarts";

const defaultStyle = {
    itemStyle: {
        areaColor: 'rgba(8,170,210,0.13)',
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.5)",
        shadowColor: "rgb(0,160,255)",
        shadowBlur: 1,
        shadowOffsetY: 2
    },
    borderStyle: {
        fill: 'none',
        lineWidth: 1.5,
        stroke: "rgba(74,201,255,1)",
        shadowBlur: 8,
        shadowColor: "rgba(0,141,255,1)"
    },
    bottomMapStyle: {
        fill: 'rgba(0,38,68,0.05)',
        stroke: 'rgb(92,173,239)',
    },
    layerMapStyle: {
        fill: 'none',
        lineWidth: 0.8,
        shadowBlur: 0,
        shadowColor: "rgba(0,141,255,0)",
        stroke: "rgba(0,113,255,0.1)",
        layerMapNum: 20
    },
    animate: {
        show: true, // 动效是否显示
        constantSpeed: 'auto', // 流向统一速度
        trailLength: 0.9, // 特效尾迹的长度
        symbol: 'circle',
        symbolSize: 5,
        delay: 0,
        color: 'rgb(84,241,246, 0.8)'
    }
}

export interface IOption {
    echarts: EChartsType
    width: number,
    height: number,
    geoJson: {
        full: GeoJSON,
        border: GeoJSON,
        mapName: string
    },
    mapStyle?: {
        itemStyle?: ItemStyleOption,
        borderStyle?: ItemStyleOption,
        bottomMapStyle?: ItemStyleOption,
        layerMapStyle?: ItemStyleOption
    },
    animate?: {
        show?: boolean,
        constantSpeed?: number | string,
        trailLength?: number,
        symbol?: string,
        symbolSize?: number,
        delay?: number,
        color?: echarts.Color
    },
    cityCoords?: {
        [keys: string]: number[]
    }
}

export interface INameCoords {
    name: string,
    coords: number[]
}

export default function mapPro(opt: IOption) {
    const {
        width,
        height,
        geoJson,
        mapStyle,
        cityCoords
    } = opt

    if (!geoJson) {
        return null
    }
    const {full: fullGeoJson, border: borderGeoJson} = geoJson

    if (!borderGeoJson) {
        return
    }

    const mainGeoJson: GeoJSON = fullGeoJson

    if (mapStyle) {
        Object.keys(mapStyle).forEach(key => {
            // @ts-ignore
            Object.assign(defaultStyle[key], mapStyle[key])
        })
    }

    if (opt.animate) {
        Object.assign(defaultStyle.animate, opt.animate);
    }

    // @ts-ignore
    const chart = echarts.init(null, null, {width, height, renderer: "svg", ssr: true})

    const fullMapName = geoJson.mapName


    // @ts-ignore
    echarts.registerMap(fullMapName, mainGeoJson)

    chart.setOption({
        geo: {
            map: fullMapName,
            zoom: 1,
            roam: true,
            label: {
                show: false
            },
            z: 1,
            itemStyle: defaultStyle.itemStyle
        },
        series: []
    })

    // regionPath
    let regionPathStr: string = ""
    // @ts-ignore
    const list = Object.assign({}, chart.getZr().painter.storage.getDisplayList(true))
    const listKeys = Object.keys(list)
    if (listKeys.length > 1) {
        const keyMap = {}
        Object.keys(list).forEach(key => {
            const item = list[key]
            // @ts-ignore
            keyMap[item.id] = item._textContent.style.text
        })
        // @ts-ignore
        const VNode = chart.getZr().painter.renderToVNode({
            animation: false,
            willUpdate: false,
            compress: true,
            useViewBox: true
        })

        VNode.children.forEach((child: any) => {
            // @ts-ignore
            if (keyMap[child.key]) {
                // @ts-ignore
                child.attrs.name = keyMap[child.key]
                const opacity = child.attrs["fill-opacity"]
                child.attrs["fill-opacity"] = 1
                const color = parseColor(child.attrs["fill"])
                child.attrs["fill"] = 'rgba(' + color!.r + ',' + color!.g + ',' + color!.b + ',' + opacity + ')'
            }
        })
        regionPathStr = vNodeToString(VNode, true)
    }

    // customMap
    const drawMap3d = () => {
        const group = {
            type: 'group',
            z2: 0,
            children: []
        }

        let layerNum = defaultStyle.layerMapStyle.layerMapNum
        if (layerNum > 20) layerNum = 20
        mainGeoJson.features.forEach(feat => {
            const coordinates = feat.geometry.coordinates
            const type = feat.geometry.type
            for (let p = 0; p < coordinates.length; p++) {
                const allPoints: any[] = []
                // @ts-ignore
                let coordsList = coordinates[p][0]
                if (type === "Polygon") {
                    coordsList = coordinates[p]
                }
                // @ts-ignore
                coordsList.forEach(item => {
                    allPoints.push(chart.convertToPixel('geo', item))
                })
                const lightBorder = {
                    type: 'polyline',
                    id: `lightBorder_${p}`,
                    shape: {
                        points: allPoints
                    },
                    style: defaultStyle.borderStyle
                }
                const bottomMap = {
                    type: 'polygon',
                    id: `bottomMap_${p}`,
                    shape: {
                        points: allPoints
                    },
                    x: 0,
                    y: layerNum,
                    style: defaultStyle.bottomMapStyle
                }
                // @ts-ignore
                group.children.push(lightBorder, bottomMap)

                // 添加地图层级
                for (let i = 1; i < layerNum; i++) {
                    const z_indexMap = {
                        type: 'polyline',
                        id: `layer_${p}_${i}`,
                        shape: {
                            points: allPoints
                        },
                        z2: i,
                        x: 0,
                        y: i,
                        style: defaultStyle.layerMapStyle
                    }
                    // @ts-ignore
                    group.children.push(z_indexMap)
                }
            }
        })

        borderGeoJson.features.forEach(feat => {
            const coordinates = feat.geometry.coordinates
            const tempStyle = Object.assign({}, defaultStyle.borderStyle)
            for (let p = 0; p < coordinates.length; p++) {
                const allPoints: any[] = []
                // @ts-ignore
                coordinates[p][0].forEach(item => {
                    allPoints.push(chart.convertToPixel('geo', item))
                })
                tempStyle.lineWidth *= 1.3
                const lightBorder = {
                    type: 'polyline',
                    id: `lightBorder2_${p}`,
                    shape: {
                        points: allPoints
                    },
                    style: tempStyle
                }
                // @ts-ignore
                group.children.push(lightBorder)
            }
        })

        return group
    }

    chart.setOption({
        series: [
            {
                type: 'custom',
                id: 'customMap',
                animation: false,
                show: false,
                silent: true,
                coordinateSystem: 'geo',
                renderItem: drawMap3d,
                z: 0,
                data: [0]
            }
        ]
    })
    const svgStr = chart.renderToSVGString({useViewBox: true})
    const mapSvg = parseSvg(svgStr, regionPathStr)
    // @ts-ignore
    const geoUtils: CoordinateSystem = chart._coordSysMgr._coordinateSystems[0]

    // textShapes
    const nameCoords: INameCoords[] = [];
    mainGeoJson.features.forEach(feat => {
        const {name, cp, center} = feat.properties
        const coords = cp || center
        if (name && coords) {
            nameCoords.push({name, coords})
        }
    })
    const renderTextShapes = (params: any, api: any, minHide = 0.3, callback?: (textShape: CustomTextOption) => void) => {
        const children = []
        const zoom = params.coordSys.zoom
        for (let i = 0; i < nameCoords.length; i++) {
            const {name} = nameCoords[i]

            if (cityCoords && cityCoords[name]) {
                nameCoords[i].coords = cityCoords[name]
            }

            const coords = nameCoords[i].coords

            const point = geoUtils.dataToPoint(coords)
            const [x, y] = api.coord(point)
            let px = 12
            if (zoom >= 1) {
                px += zoom * 2
            } else {
                px -= zoom * 2
                if (zoom < minHide) {
                    px = 0
                }
            }
            const textShape: CustomTextOption = {
                type: 'text',
                id: `${name}_shape`,
                x: x - px * name.length / 2,
                y: y,
                invisible: x === 0,
                ignore: x === 0,
                style: {
                    text: name,
                    font: `bolder ${px}px "Microsoft YaHei", sans-serif`,
                    fill: '#ffffff'
                }
            }
            if (callback) {
                callback(textShape)
            }
            children.push(textShape)
        }
        return {
            type: 'group',
            id: 'mapCityTextGroup',
            children
        }
    }
    const cityTextShape = (minHide = 0.4, callback?: (text: CustomTextOption) => void) => {
        return {
            type: 'custom',
            id: 'city-text',
            coordinateSystem: 'geo',
            data: [0],
            renderItem: (params: any, api: any) => renderTextShapes(params, api, minHide, (text: CustomTextOption) => {
                // 回调
                if (callback) {
                    callback(text)
                }
            })
        }
    }


    const animateLines: any[] = []
    if (borderGeoJson && defaultStyle.animate.show) {
        borderGeoJson.features.forEach(feat => {
            const coordinates = feat.geometry.coordinates
            for (let p = 0; p < coordinates.length; p++) {
                const allPoints: any[] = []
                // @ts-ignore
                coordinates[p][0].reduce((previousValue, currentValue) => {
                    const prev = geoUtils.dataToPoint(previousValue)
                    const curr = geoUtils.dataToPoint(currentValue)
                    allPoints.push(prev, curr)
                    return currentValue
                })
                const pointLength = allPoints.length
                if (pointLength >= 100) {
                    let speed = defaultStyle.animate.constantSpeed
                    if (speed === 'auto' || typeof speed === 'string') {
                        // @ts-ignore
                        defaultStyle.animate.constantSpeed = pointLength / 10
                    }
                    const lines = {
                        type: 'lines',
                        id: `border-lines_${p}`,
                        polyline: true,
                        coordinateSystem: 'geo',
                        data: [
                            {
                                coords: allPoints
                            }
                        ],
                        effect: defaultStyle.animate,
                        lineStyle: {
                            color: 'rgba(255,255,255,0)'
                        }
                    }
                    animateLines.push(lines)
                }
            }
        })
    }

    chart.dispose()

    const shapesList = {
        animateLinesShape: () => animateLines,
        cityTextShape
    }
    const cityList = nameCoords.map(item => item.name)

    return {
        mapSvg,
        geoUtils,
        shapesList,
        cityList
    }
}
