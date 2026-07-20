import { useState, useRef, useEffect, useCallback } from 'react'
import s from './FavoritesRadial.module.css'

/**
 * Menu radial de favoritos — adaptado de PeekCircleClean.jsx (Tailwind +
 * lucide-react) pra CSS Modules + tokens de tema deste projeto. A física
 * (lerp/inércia/snap) é a mesma; o que muda é a fonte dos itens (favorites
 * do usuário, não uma lista fixa) e o que acontece ao selecionar (navega
 * de verdade via onSelect em vez de só marcar um estado local).
 *
 * "Anel infinito": em vez de espalhar N itens pelos 360° inteiros (o que
 * deixa 2 itens diametralmente opostos, 3 a 120° etc.), o passo angular é
 * fixo (~TARGET_STEP) e a lista repete quantas vezes forem necessárias pra
 * preencher o anel sem sobra — os itens ficam sempre próximos uns dos
 * outros e o giro continua "infinito" (sem vão vazio), não importa quantos
 * favoritos existam.
 */

const RADIUS      = 54
const ITEM_SIZE   = 38
const ARC_HALF    = 98
const HUB         = 61
const HUB_PEEK    = 21
const FACE_ANGLE  = -90 // hub fica embaixo, arco abre pra cima
const MIN_STEP    = 50  // separação angular mínima garantida entre vizinhos

const FRICTION_RATE = 6.5
const MIN_VEL       = 2
const SNAP_RATE      = 14
const WHEEL_SENS     = 2.6
const SMOOTH_RATE    = 16
const MAX_DT         = 0.05
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function wrap(deg) {
  let d = ((deg % 360) + 360) % 360
  if (d > 180) d -= 360
  return d
}

function damp(rate, dt) {
  return 1 - Math.exp(-rate * dt)
}

// quantas "voltas" da lista de itens cabem no anel sem deixar o passo cair
// abaixo de MIN_STEP (floor em vez de round: erra sempre pro lado de mais
// espaço, nunca de itens colados) — o passo resultante sempre divide 360
// sem sobra, então o giro nunca tem vão vazio na emenda
function ringFor(n) {
  if (n === 0) return { slots: 0, step: 0 }
  const reps = Math.max(1, Math.floor(360 / (MIN_STEP * n)))
  const slots = reps * n
  return { slots, step: 360 / slots }
}

export function FavoritesRadial({ items, activeView, onSelect }) {
  const [revealed, setRevealed] = useState(false)
  const [, force] = useState(0)

  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  const rotationRef  = useRef(0)
  const targetRef    = useRef(0)
  const velocityRef  = useRef(0)
  const lastTimeRef  = useRef(0)
  const rafRef       = useRef(null)
  const containerRef = useRef(null)

  const hubSize = revealed ? HUB : HUB_PEEK

  const centerIndex = useCallback(() => {
    const n = itemsRef.current.length
    if (n === 0) return 0
    const { slots, step } = ringFor(n)
    let best = 0, bestAbs = Infinity
    for (let i = 0; i < slots; i++) {
      const a = Math.abs(wrap(i * step + targetRef.current))
      if (a < bestAbs) { bestAbs = a; best = i }
    }
    return best
  }, [])

  const tick = useCallback((now) => {
    const n = itemsRef.current.length
    if (n === 0) { rafRef.current = null; return }
    const { step } = ringFor(n)

    const prev = lastTimeRef.current || now
    let dt = (now - prev) / 1000
    lastTimeRef.current = now
    if (dt > MAX_DT) dt = MAX_DT

    if (Math.abs(velocityRef.current) > MIN_VEL) {
      targetRef.current += velocityRef.current * dt
      velocityRef.current *= Math.exp(-FRICTION_RATE * dt)
    } else {
      velocityRef.current = 0
      const idx = centerIndex()
      const current = wrap(idx * step + targetRef.current)
      targetRef.current -= current * damp(SNAP_RATE, dt)
      if (Math.abs(current) < 0.05) {
        targetRef.current -= wrap(idx * step + targetRef.current)
      }
    }

    const diff = targetRef.current - rotationRef.current
    rotationRef.current += diff * damp(SMOOTH_RATE, dt)

    force(x => x + 1)

    const settled =
      Math.abs(velocityRef.current) <= MIN_VEL &&
      Math.abs(targetRef.current - rotationRef.current) < 0.01 &&
      Math.abs(wrap(centerIndex() * step + targetRef.current)) < 0.05

    if (settled) {
      rotationRef.current = targetRef.current
      rafRef.current = null
      lastTimeRef.current = 0
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [centerIndex])

  const startLoop = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const handleWheel = useCallback((e) => {
    if (!revealed) return
    e.preventDefault()
    velocityRef.current += e.deltaY * WHEEL_SENS
    startLoop()
  }, [revealed, startLoop])

  const nudge = useCallback((dir) => {
    const n = itemsRef.current.length
    if (n === 0) return
    const { step } = ringFor(n)
    targetRef.current += dir * step
    startLoop()
  }, [startLoop])

  const selectIndex = useCallback((i) => {
    const n = itemsRef.current.length
    if (n === 0) return
    const { step } = ringFor(n)
    const rawTarget = -i * step
    const k = Math.round((targetRef.current - rawTarget) / 360)
    targetRef.current = rawTarget + 360 * k
    const item = itemsRef.current[i % n]
    if (item) onSelect(item.id)
    startLoop()
  }, [onSelect, startLoop])

  const handleKey = useCallback((e) => {
    if (!revealed) return
    if (e.key === 'ArrowUp')        { e.preventDefault(); nudge(1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1) }
    else if (e.key === 'Enter')     { e.preventDefault(); selectIndex(centerIndex()) }
  }, [revealed, nudge, selectIndex, centerIndex])

  useEffect(() => () => rafRef.current && cancelAnimationFrame(rafRef.current), [])

  const n = items.length
  if (n === 0) return null
  const { slots, step } = ringFor(n)

  return (
    <div
      ref={containerRef}
      className={s.wheel}
      tabIndex={0}
      onMouseEnter={() => { setRevealed(true); containerRef.current?.focus() }}
      onMouseLeave={() => setRevealed(false)}
      onWheel={handleWheel}
      onKeyDown={handleKey}
      style={{ width: (RADIUS + ITEM_SIZE) * 2, height: RADIUS + ITEM_SIZE + 15 }}
    >
      <div
        className={s.arc}
        style={{
          opacity: revealed ? 1 : 0,
          pointerEvents: revealed ? 'auto' : 'none',
          transform: `translateY(-${15 + HUB / 2}px)`,
          transition: `opacity 0.45s ${EASE}`,
        }}
      >
        {Array.from({ length: slots }, (_, i) => {
          const item    = items[i % n]
          const angle   = wrap(i * step + rotationRef.current)
          const visible = Math.abs(angle) <= ARC_HALF
          const rad     = ((angle + FACE_ANGLE) * Math.PI) / 180
          const x       = Math.cos(rad) * RADIUS
          const y       = Math.sin(rad) * RADIUS
          const edge    = 1 - Math.abs(angle) / ARC_HALF
          const scale   = 0.5 + edge * 0.5
          const isCurrent = activeView === item.id

          return (
            <button
              key={`${item.id}-${i}`}
              title={item.label}
              aria-label={item.label}
              onClick={() => selectIndex(i)}
              className={`${s.item} ${isCurrent ? s.itemActive : ''}`}
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                marginLeft: -ITEM_SIZE / 2,
                marginTop: -ITEM_SIZE / 2,
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                opacity: visible ? 0.55 + edge * 0.45 : 0,
                transition: `background-color 0.25s ${EASE}, color 0.25s ${EASE}, opacity 0.2s linear`,
              }}
            >
              {item.code}
            </button>
          )
        })}
      </div>

      <div
        className={s.hub}
        style={{
          width: hubSize,
          height: hubSize,
          borderWidth: revealed ? 2 : 9,
          transform: revealed
            ? 'translateX(-50%) translateY(-15px)'
            : `translateX(-50%) translateY(${hubSize / 2}px)`,
          transition: `width 0.5s ${EASE}, height 0.5s ${EASE}, transform 0.5s ${EASE}, border-width 0.5s ${EASE}`,
        }}
      />
    </div>
  )
}
