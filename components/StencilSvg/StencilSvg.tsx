import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import styles from './StencilSvg.module.scss'
import {
  translate,
  Position,
  plotCircle,
  vec,
  Vector,
} from '../../utlis/geometry'
import { start } from 'repl'
import { usePointer } from '../../hooks/usePointer'
import { globalWindowValue } from '../../hooks/useEventListener'

const paths = [
  {
    name: 'Bolt',
    paths: [
      {
        d: 'M68.4298 120.005C82.3345 117.469 91.2762 126.279 89.0515 140.29L88.3241 144.717C86.9123 153.613 95.8968 157.438 101.288 150.218L142.189 95.25C148.692 86.5257 143.258 77.7583 132.605 79.8212C118.743 82.4858 109.759 73.7185 111.983 59.7079L112.711 55.3243C114.165 46.3851 105.138 42.5601 99.7045 49.7802L58.8463 104.447C52.3005 113.214 57.6912 121.982 68.4298 120.005Z',
      },
    ],
  },
  {
    name: 'Star',
    paths: [
      {
        d: 'M141.743 80.4016H141.864C152.853 82.0117 155.872 91.3506 147.942 99.0793L147.902 99.1195C132.726 113.893 132.163 115.624 135.625 136.515V136.636C137.436 147.545 129.466 153.261 119.725 148.028C101.449 138.246 98.9536 138.246 80.6382 147.947L80.4369 148.068C70.6151 153.261 62.6851 147.504 64.577 136.555V136.475C68.1998 115.825 67.5155 113.772 52.5009 99.1195L52.4606 99.0793C44.5307 91.3506 47.5497 82.0117 58.5389 80.4016H58.6597C79.4708 77.3423 80.92 76.2554 90.3393 57.457C95.2905 47.5143 105.112 47.5143 110.064 57.457C119.483 76.2554 120.932 77.3423 141.743 80.4016Z',
      },
    ],
  },
  {
    name: 'Speech bubble',
    paths: [
      {
        d: 'M100 135.909C129.271 135.909 153 117.573 153 94.9545C153 72.336 129.271 54 100 54C70.7289 54 47 72.336 47 94.9545C47 107.543 54.35 118.805 65.9148 126.317C68.395 127.929 70.1917 130.696 69.2135 133.487C67.9467 137.102 67.8505 138.323 64.5 139.5C62 140.378 61.5 144.449 64.5 145.5C73.3806 148.613 80.6746 145.799 87.5571 140.378C90.8962 137.748 94.9324 135.855 99.1828 135.904C99.4547 135.907 99.7271 135.909 100 135.909Z',
      },
    ],
  },
  {
    name: 'Heart',
    paths: [
      {
        d: 'M81.0912 135.153L81.0014 135.092C80.9303 135.043 80.8368 134.979 80.7225 134.9C80.494 134.743 80.1812 134.526 79.7961 134.257C79.0275 133.72 77.9608 132.966 76.6931 132.049C74.1954 130.242 70.7441 127.676 67.1878 124.801C63.8115 122.071 59.5075 118.397 55.7628 114.413C53.9288 112.462 51.4503 109.622 49.2314 106.129C47.5987 103.558 43 95.976 43 85.5C43 66.9985 57.9985 52 76.5 52C85.6555 52 93.9531 55.6728 100 61.6253C106.047 55.6728 114.345 52 123.5 52C142.002 52 157 66.9985 157 85.5C157 95.976 152.401 103.558 150.769 106.129C148.55 109.622 146.071 112.462 144.237 114.413C140.492 118.397 136.189 122.071 132.812 124.801C129.256 127.676 125.805 130.242 123.307 132.049C122.039 132.966 120.973 133.72 120.204 134.257C119.819 134.526 119.506 134.743 119.277 134.9C119.163 134.979 119.07 135.043 118.999 135.092L118.909 135.153L118.858 135.188L118.854 135.191C118.854 135.191 102 148.027 100 148.027C98 148.027 81.1465 135.191 81.1465 135.191L81.1415 135.188L81.0912 135.153Z',
      },
    ],
  },
  {
    name: 'Location',
    paths: [
      {
        d: 'M69.5944 60.6173C86.387 43.7942 113.613 43.7942 130.406 60.6173C139.733 69.9617 143.879 82.5309 142.845 94.7424C141.151 114.739 125.487 130.665 111.163 144.721C106.882 148.921 102.792 152 100 152C97.2082 152 93.1181 148.921 88.8374 144.721C74.5132 130.665 58.8487 114.739 57.1549 94.7424C56.1205 82.5309 60.267 69.9617 69.5944 60.6173Z',
      },
      {
        d: 'M117 94C117 103.389 109.389 111 100 111C90.6112 111 83 103.389 83 94C83 84.6112 90.6112 77 100 77C109.389 77 117 84.6112 117 94Z',
        direction: 'inside',
      },
    ],
  },
  {
    name: 'Triangle',
    paths: [
      {
        d: 'M128.346 73.3921L148.374 102.659C163.031 124.049 152.371 144 126.246 144H73.7538C47.6287 144 36.9687 124.049 51.6262 102.659L71.6541 73.3921C87.5633 50.2026 112.437 50.2026 128.346 73.3921Z',
      },
    ],
  },
  // {
  //   name: 'Cross',
  //   paths: [
  //     {
  //       d: 'M117.485 55.6154L115.563 57.5368C107.032 66.0679 93.3135 66.1063 84.744 57.6137L82.592 55.5386C75.0985 48.1219 63.0705 48.1603 55.6154 55.6154C48.1988 63.0321 48.1988 75.0985 55.6154 82.5152L57.5368 84.4366C66.0679 92.9676 66.1063 106.687 57.6137 115.256L55.5386 117.408C48.1219 124.901 48.1603 136.93 55.6154 144.385C63.0705 151.84 75.0985 151.878 82.592 144.461L84.744 142.386C93.3135 133.894 107.032 133.932 115.563 142.463L117.485 144.385C124.901 151.801 136.968 151.801 144.385 144.385C151.84 136.93 151.878 124.901 144.461 117.408L142.386 115.256C133.894 106.687 133.932 92.9676 142.463 84.4366L144.385 82.5152C151.801 75.0985 151.801 63.0321 144.385 55.6154C136.968 48.1988 124.901 48.1988 117.485 55.6154Z',
  //     },
  //   ],
  // },
]

type StencilSvgPath = { d: string; direction?: string }

type StencilSvgProps = {
  enter: boolean
  display: boolean
  transition: 'in' | 'out'
  width: number
  height: number
  path: { paths: StencilSvgPath[]; name: string }
}

export const StencilSvg = ({
  enter,
  display,
  transition,
  width,
  height,
  path,
}: StencilSvgProps) => {
  const pointer = usePointer()
  const { x, y } = pointer
  const dX = globalWindowValue && x ? x - window.innerWidth / 2 : 1
  const dY = globalWindowValue && y ? y - window.innerHeight / 2 : 1
  const dist = Math.hypot(dX, dY)
  const max = globalWindowValue
    ? Math.hypot(window.innerWidth / 2, window.innerHeight / 2) * 0.35
    : 1
  const ratio = Math.min(1, dist / max) ** 2
  const t = 1 - ratio

  const [points, setPoints] = useState<JSX.Element[]>([])
  // const [prevPoints, setPrevPoints] = useState<JSX.Element[]>([])
  const svgRef = useRef<SVGSVGElement>(null)
  const boxWidth = width
  const boxHeight = height
  const xmlns = 'http://www.w3.org/2000/svg'
  const pathName = useRef<string>()
  // const pointer = usePointer()

  const pathCallback = useCallback(
    (node: SVGPathElement) => {
      requestAnimationFrame(() => {
        const svg = node?.closest('svg')
        const g = node?.closest('g')
        if (node && svg && g) {
          const totalLength = node.getTotalLength()
          const factor = totalLength > 200 ? 1 : totalLength > 150 ? 0.6 : 0.8
          const settings = [
            {
              intersections: ~~((totalLength / 5) * factor),
              getRadius: () => ~~(Math.random() ** 2 * 8 * factor) + 3,
              getRelativeDistance: () => 1,
            },
            {
              intersections: ~~((totalLength / 10) * factor),
              getRadius: () => ~~(Math.random() ** 2 * 5 * factor) + 1,
              getRelativeDistance: () => 3,
            },
            {
              intersections: ~~(totalLength / 6),
              getRadius: () => ~~(Math.random() * Math.random() * 2) + 1,
              getRelativeDistance: () =>
                Math.max(Math.random() * 9 * factor, 1),
            },
          ]
          const index = parseInt(node.dataset.index ?? '0')
          console.time('Stencil' + path.name)
          const stencilPoints = settings.flatMap((s, i) => {
            return distribute(
              `${path.name}-node-${node.dataset.index}-distribution-${i}`,
              svg,
              path.paths[index],
              node,
              s.intersections,
              s.getRadius,
              s.getRelativeDistance
            )
          })
          console.timeEnd('Stencil' + path.name)
          setPoints((points) => {
            const newPoints = [
              ...(pathName.current && pathName.current === path.name
                ? points
                : []),
              ...stencilPoints,
            ]
            // setPrevPoints(newPoints)
            return newPoints
          })
          pathName.current = path.name
        }
      })
    },
    [path.name, path.paths]
  )

  const currentPointsGroup = (
    <g className={transition === 'in' ? styles.in : styles.out} key={path.name}>
      {path.paths.map((p, i) => (
        <path
          key={p.d}
          ref={pathCallback}
          d={p.d}
          fill="transparent"
          data-index={i}
        />
      ))}
      {points}
    </g>
  )
  // useEffect(() => setPrevPoints(points), [points, setPrevPoints])

  // const groups = [prevPointsGroup, currentPointsGroup].filter((p) => p)

  return (
    <svg
      key="svg"
      className={`${styles.svg} ${transition === 'in' ? styles.svgIn : ''}`}
      xmlns={xmlns}
      width={boxWidth}
      height={boxHeight}
      viewBox="0 0 200 200"
      ref={svgRef}
      style={
        {
          display: display || !points.length ? '' : 'none',
          // '--pointer-x': pointer.x
          //   ? `${(pointer.x / window.innerWidth - 0.5) * window.innerWidth}px`
          //   : '',
          // '--pointer-y': pointer.y
          //   ? `${(pointer.y / window.innerHeight - 0.5) * window.innerHeight}px`
          //   : '',
          '--added-delay': !enter ? 'calc(var(--duration) * 0.9)' : '0ms',
          '--circle-pump-distance-max': `${-6 * (1 + t * 40)}px`,
        } as CSSProperties
      }
    >
      {currentPointsGroup}
    </svg>
  )
}

export const StencilSvgAnimation = () => {
  const [index, setIndex] = useState<number>(0)
  const started = useRef<boolean>(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const prevIndexRef = useRef<number>()
  const nextDirectIndexRef = useRef<number>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    started.current = true
  }, [])

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      const nextIndexInSet = (index + 1) % paths.length
      const active = document.activeElement
      if (active instanceof HTMLButtonElement) {
        active.blur()
      }
      setIndex(nextIndexInSet)
    }, 3000)
    return () => {
      clearTimeout(timeoutRef.current)
    }
  }, [index, setIndex])

  useEffect(() => {
    prevIndexRef.current = nextDirectIndexRef.current || index
    if (nextDirectIndexRef.current === index) {
      nextDirectIndexRef.current = undefined
    }
  }, [index])

  const prevIndex = prevIndexRef.current
  console.log({ index, prevIndex })

  const getHandleTargetPath = (i: number) => () => {
    if (index !== i) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      prevIndexRef.current = index
      nextDirectIndexRef.current = i
    }
  }

  const getHandleAnimatePath = (i: number) => () => {
    if (index !== i) {
      const refresh = () => {
        if (nextDirectIndexRef.current === i) {
          if (
            wrapperRef.current?.getAnimations({ subtree: true }).some((a) => {
              /* @ts-expect-error the animationName seems to be there */
              const name = a.animationName
              return a.playState === 'running' && name !== styles['circle-pump']
            })
          ) {
            console.log('animations running')
            requestAnimationFrame(refresh)
          } else {
            console.log('animations over', index, i)
            setTimeout(() => {
              prevIndexRef.current = index
              nextDirectIndexRef.current = i
              setIndex(i)
            })
          }
        }
      }
      requestAnimationFrame(refresh)
    }
  }
  return (
    <>
      <div className={styles.container}>
        <div className={styles.wrapper} key="wrapper" ref={wrapperRef}>
          {paths.map((path, i) => (
            <StencilSvg
              enter={!started.current}
              key={path.name}
              transition={i === index ? 'in' : 'out'}
              width={442}
              height={442}
              path={path}
              display={i === index || (started.current && i === prevIndex)}
            />
          ))}
        </div>
      </div>
      <ul className={styles.controls}>
        {paths.map((path, i) => (
          <li key={path.name}>
            <button
              aria-label={path.name}
              onClick={() => {
                getHandleTargetPath(i)()
                getHandleAnimatePath(i)()
              }}
              onMouseMove={() => getHandleTargetPath(i)()}
              onMouseEnter={(event) => {
                event.currentTarget.focus()
                getHandleAnimatePath(i)()
              }}
              style={{
                color:
                  i === index ? 'var(--color-toolbar-button-color-hover)' : '',
              }}
            >
              <svg viewBox="0 0 200 200">
                <path
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d={path.paths.map((p) => p.d).join('')}
                ></path>
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function distribute(
  key: string,
  parentSvg: SVGSVGElement,
  path: StencilSvgPath,
  svgPath: SVGPathElement,
  intersections: number,
  getRadius: () => number,
  getRelativeDistance = (radius: number) => 1
) {
  const totalLength = svgPath.getTotalLength()
  const evenDistance = (1 / intersections) * totalLength
  const result = []
  for (let i = 0; i < intersections; i++) {
    const distance = i * evenDistance + Math.random() * 0.5 * evenDistance
    const point = getPointAndVecAtLength(svgPath, distance)
    let radius = getRadius()
    const relativeDistance = getRelativeDistance(radius)
    const opacity = (~~(Math.random() * 6) + 3) / 10

    let offsetPoint = translate(
      point,
      point.v.normal,
      radius * relativeDistance,
      1
    )
    const svgPoint = parentSvg.createSVGPoint()
    svgPoint.x = offsetPoint.x
    svgPoint.y = offsetPoint.y
    const inFill = svgPath.isPointInFill(svgPoint)

    const isInside = (path.direction === 'inside' && !inFill) || inFill
    if (isInside) {
      offsetPoint = translate(
        point,
        point.v.normal,
        radius * relativeDistance,
        -1
      )
    }

    const isCircleNotOverlapingFill = (circlePoints: Position[]) =>
      circlePoints.some((p) => {
        const svgPoint = parentSvg.createSVGPoint()
        svgPoint.x = p.x
        svgPoint.y = p.y
        return !svgPath.isPointInFill(svgPoint)
      })
    const isCircleOverlapingFill = (circlePoints: Position[]) =>
      circlePoints.some((p) => {
        const svgPoint = parentSvg.createSVGPoint()
        svgPoint.x = p.x
        svgPoint.y = p.y
        return svgPath.isPointInFill(svgPoint)
      })

    while (
      radius > 1 &&
      (path.direction === 'inside'
        ? isCircleNotOverlapingFill(plotCircle(offsetPoint, radius))
        : isCircleOverlapingFill(plotCircle(offsetPoint, radius)))
    ) {
      radius *= 2 / 3
    }

    const percentage = i / intersections
    const color = getColor(percentage)
    // const loopedPalette = [...palette, ...palette.reverse().slice(1, palette.length - 1)]
    // const color = loopedPalette[Math.round((loopedPalette.length - 1) * percentage)]
    result.push(
      <Circle
        key={`${key}-circle-${result.length}`}
        x={offsetPoint.x}
        y={offsetPoint.y}
        pointVector={{
          ...point.v,
          normal: {
            x: point.v.normal.x * (isInside ? 1 : -1),
            y: point.v.normal.y * (isInside ? 1 : -1),
          },
        }}
        radius={radius}
        color={color}
        opacity={opacity}
      />
    )
  }
  return result
}

type CircleProps = {
  x: number
  y: number
  pointVector: Vector
  radius: number
  color: string
  opacity: number
}
function Circle({
  x,
  y,
  pointVector,
  radius = 5,
  color = 'black',
  opacity = 0.5,
}: CircleProps) {
  return (
    <g
      className={styles.circle}
      style={
        {
          opacity: opacity,
          '--x': `${x}px`,
          '--y': `${y}px`,
          '--dx': `${pointVector.normal.x}`,
          '--dy': `${pointVector.normal.y}`,
          '--offset': `${15}px`,
          '--random': `${Math.random()}`,
        } as CSSProperties
      }
    >
      <circle cx={x} cy={y} r={radius} fill={color} />
    </g>
  )
}

function getPointAndVecAtLength(svgPath: SVGPathElement, length: number) {
  const totalLength = svgPath.getTotalLength()
  const resolution = 1024
  const p1 = svgPath.getPointAtLength(length)
  const p2 = svgPath.getPointAtLength(
    Math.min(length + totalLength / resolution, totalLength)
  )
  const v = vec(p1, p2)
  return {
    x: p1.x,
    y: p1.y,
    v: v,
  }
}

const presets = {
  ['Half rainbow']: { range: 180, start: 180, saturation: 84, lightness: 62 },
  ['Trichromatic']: { range: 100, start: 300, saturation: 84, lightness: 62 },
  ['Trichromatic 2']: { range: 75, start: 160, saturation: 84, lightness: 62 },
  ['Rainbow']: { range: 300, start: 60, saturation: 84, lightness: 62 },
  ['Autumn']: { range: 180, start: 300, saturation: 84, lightness: 62 },
  ['Monochromatic']: { range: 15, start: 300, saturation: 84, lightness: 0 },
}

function getColor(percentage: number, preset = presets['Trichromatic']) {
  const start = preset.start // 55
  const end = preset.start + preset.range
  const distance = end - start
  const hue =
    percentage < 0.5
      ? start + distance * percentage * 2
      : end - distance * (percentage - 0.5) * 2
  return `hsl(${hue}, ${preset.saturation}%, ${preset.lightness}%)`
}
