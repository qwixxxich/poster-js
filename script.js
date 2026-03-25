document.addEventListener('DOMContentLoaded', () => {
    const tube = document.getElementById('tube')
    const tubeOverlay = document.getElementById('tube-overlay')
    const promptForm = document.getElementById('tube-form')
    const promptInput = document.getElementById('prompt-input')
    const statusEl = document.getElementById('status')
    const firstSection = document.getElementById('first')
    const secondSection = document.getElementById('second')
    const thirdSection = document.getElementById('third')
    const sceneButton = document.getElementById('scene-button')
    const sceneButtonImage = document.getElementById('scene-button-image')
    const promptSubmit = document.getElementById('prompt-submit')
    const sectionText = document.getElementById('section1-text')
    const section2Text = document.getElementById('section2-text')
    const section3Tube = document.getElementById('section3-tube')
    const vectorLine = document.getElementById('VectorLine')
    const fruits = Array.from(document.querySelectorAll('.fruit'))
    const selectedFruits = new Set()
    let sceneButtonPressed = false
    let tubeFlyAwayTimeoutId = null
    let thirdTubeActivated = false
    let generatedTubeImage = null
    let vectorPathElement = null
    let vectorPathLength = 0

    const inputState = {
        progress: 0,
    }
    const tiltState = {
        progress: 0,
        enabled: false,
    }
    const thirdTubeState = {
        progress: 0,
        active: false,
        falling: false,
        hidden: false,
        x: 0,
        y: 0,
        angle: 0,
        width: 140,
        fallVelocity: 0,
    }

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
    const isTiltLeft = (axisValue) => axisValue <= -10
    const isTiltRight = (axisValue) => axisValue >= 10
    const getScreenAngle = () => {
        if (screen.orientation && typeof screen.orientation.angle === 'number') {
            return screen.orientation.angle
        }

        if (typeof window.orientation === 'number') {
            return window.orientation
        }

        return 0
    }

    const vectorPathData = 'M1244.99 0.929688H230.593C103.753 0.929688 0.929688 103.761 0.929688 230.61C0.929688 357.46 103.753 460.291 230.593 460.291H757.956C875.135 460.291 935.5 556.808 935.5 674C911.5 787 841.234 845.676 757.956 850.5H706C575.005 850.5 501 900.86 501 1031.87V1036.5'
    const vectorViewBox = {
        width: 1217,
        height: 1037,
    }

    const ensureVectorPath = () => {
        if (!thirdSection || !vectorLine || vectorPathElement) {
            return
        }

        const svgNamespace = 'http://www.w3.org/2000/svg'
        const hiddenSvg = document.createElementNS(svgNamespace, 'svg')
        const path = document.createElementNS(svgNamespace, 'path')

        hiddenSvg.setAttribute('viewBox', `0 0 ${vectorViewBox.width} ${vectorViewBox.height}`)
        hiddenSvg.setAttribute('aria-hidden', 'true')
        hiddenSvg.style.position = 'absolute'
        hiddenSvg.style.width = '0'
        hiddenSvg.style.height = '0'
        hiddenSvg.style.overflow = 'hidden'
        hiddenSvg.style.pointerEvents = 'none'

        path.setAttribute('d', vectorPathData)
        path.setAttribute('fill', 'none')

        hiddenSvg.appendChild(path)
        thirdSection.appendChild(hiddenSvg)

        vectorPathElement = path
        vectorPathLength = path.getTotalLength()
    }

    const applyGeneratedTubeImage = (imageSource) => {
        generatedTubeImage = imageSource

        if (tubeOverlay) {
            tubeOverlay.classList.remove('is-fallback')
            tubeOverlay.style.backgroundImage = `url(${JSON.stringify(imageSource)})`
        }

        if (section3Tube) {
            section3Tube.classList.remove('is-fallback')
            section3Tube.style.backgroundImage = `url(${JSON.stringify(imageSource)})`
        }
    }

    const applyFallbackTubeAppearance = () => {
        generatedTubeImage = null

        if (tubeOverlay) {
            tubeOverlay.classList.add('is-fallback')
            tubeOverlay.style.backgroundImage = 'none'
        }

        if (section3Tube) {
            section3Tube.classList.add('is-fallback')
            section3Tube.style.backgroundImage = 'none'
        }
    }

    const getVectorPointAtProgress = (progress) => {
        if (!vectorPathElement || !vectorLine || !thirdSection) {
            return null
        }

        const clampedProgress = clamp(progress, 0, 1)
        const currentLength = vectorPathLength * clampedProgress
        const nextLength = Math.min(vectorPathLength, currentLength + 1)
        const currentPoint = vectorPathElement.getPointAtLength(currentLength)
        const nextPoint = vectorPathElement.getPointAtLength(nextLength)
        const lineRect = vectorLine.getBoundingClientRect()
        const thirdRect = thirdSection.getBoundingClientRect()
        const scaleX = lineRect.width / vectorViewBox.width
        const scaleY = lineRect.height / vectorViewBox.height

        return {
            x: lineRect.left - thirdRect.left + currentPoint.x * scaleX,
            y: lineRect.top - thirdRect.top + currentPoint.y * scaleY,
            angle: Math.atan2((nextPoint.y - currentPoint.y) * scaleY, (nextPoint.x - currentPoint.x) * scaleX) * (180 / Math.PI),
            width: clamp(lineRect.width * 0.18, 90, 230),
        }
    }

    const renderThirdTube = () => {
        if (!section3Tube) {
            return
        }

        if (thirdTubeState.falling) {
            section3Tube.style.left = `${thirdTubeState.x}px`
            section3Tube.style.top = `${thirdTubeState.y}px`
            section3Tube.style.width = `${thirdTubeState.width}px`
            section3Tube.style.setProperty('--tube-angle', `${thirdTubeState.angle}deg`)
            return
        }

        const point = getVectorPointAtProgress(thirdTubeState.progress)
        if (!point) {
            return
        }

        thirdTubeState.x = point.x
        thirdTubeState.y = point.y
        thirdTubeState.angle = point.angle
        thirdTubeState.width = point.width
        section3Tube.style.left = `${point.x}px`
        section3Tube.style.top = `${point.y}px`
        section3Tube.style.width = `${point.width}px`
        section3Tube.style.setProperty('--tube-angle', `${point.angle}deg`)
    }

    const syncScrollToTube = () => {
        if (!thirdSection || !thirdTubeState.active || thirdTubeState.falling || thirdTubeState.hidden) {
            return
        }

        const thirdSectionTop = thirdSection.getBoundingClientRect().top + window.scrollY
        const tubeDocumentY = thirdSectionTop + thirdTubeState.y
        const viewportOffset = window.innerHeight * 0.38
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        const targetScroll = clamp(tubeDocumentY - viewportOffset, 0, maxScroll)
        const currentScroll = window.scrollY
        const nextScroll = currentScroll + (targetScroll - currentScroll) * 0.12

        window.scrollTo(0, nextScroll)
    }

    const startTubeFall = () => {
        if (!section3Tube || thirdTubeState.falling || thirdTubeState.hidden) {
            return
        }

        thirdTubeState.falling = true
        thirdTubeState.fallVelocity = 3.5
        inputState.progress = 0
    }

    const activateThirdTube = () => {
        if (thirdTubeActivated || !section3Tube) {
            return
        }

        ensureVectorPath()
        thirdTubeActivated = true
        thirdTubeState.active = true
        thirdTubeState.falling = false
        thirdTubeState.hidden = false
        section3Tube.classList.add('is-active')
        section3Tube.classList.remove('is-hidden')
        renderThirdTube()
    }

    const getTiltAxisValue = (event) => {
        const gamma = typeof event.gamma === 'number' ? event.gamma : 0
        const beta = typeof event.beta === 'number' ? event.beta : 0
        const angle = ((getScreenAngle() % 360) + 360) % 360

        if (angle === 90) {
            return beta
        }

        if (angle === 270) {
            return -beta
        }

        if (angle === 180) {
            return -gamma
        }

        return gamma
    }

    const handleDeviceOrientation = (event) => {
        const axisValue = getTiltAxisValue(event)

        if (isTiltLeft(axisValue)) {
            tiltState.progress = 1
        } else if (isTiltRight(axisValue)) {
            tiltState.progress = -1
        } else {
            tiltState.progress = 0
        }
    }

    const enableTiltControls = async () => {
        if (tiltState.enabled || typeof window.DeviceOrientationEvent === 'undefined') {
            return
        }

        try {
            if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await window.DeviceOrientationEvent.requestPermission()
                if (permission !== 'granted') {
                    return
                }
            }

            if (typeof window.DeviceMotionEvent !== 'undefined'
                && typeof window.DeviceMotionEvent.requestPermission === 'function') {
                const motionPermission = await window.DeviceMotionEvent.requestPermission()
                if (motionPermission !== 'granted') {
                    return
                }
            }

            window.addEventListener('deviceorientation', handleDeviceOrientation)
            tiltState.enabled = true
        } catch (error) {
            console.error('Failed to enable tilt controls:', error)
        }
    }

    const updateThirdTubeMovement = () => {
        if (thirdTubeState.active) {
            if (thirdTubeState.falling) {
                const hideThreshold = thirdSection ? thirdSection.clientHeight * 0.9 : Number.POSITIVE_INFINITY

                thirdTubeState.y += thirdTubeState.fallVelocity
                thirdTubeState.fallVelocity += 0.22
                thirdTubeState.angle += 2.5
                renderThirdTube()

                if (thirdTubeState.y >= hideThreshold) {
                    thirdTubeState.hidden = true
                    thirdTubeState.active = false
                    section3Tube.classList.add('is-hidden')
                }
            } else {
                const progressDelta = clamp(inputState.progress + tiltState.progress, -1, 1) * 0.0022

                thirdTubeState.progress = clamp(thirdTubeState.progress + progressDelta, 0, 1)
                renderThirdTube()
                syncScrollToTube()

                if (thirdTubeState.progress >= 1) {
                    startTubeFall()
                }
            }
        }

        window.requestAnimationFrame(updateThirdTubeMovement)
    }

    const setKeyboardInput = (key, isPressed) => {
        const normalizedKey = key.toLowerCase()
        const value = isPressed ? 1 : 0

        if (normalizedKey === 'a' || normalizedKey === 'ф') {
            inputState.progress = value
        } else if (normalizedKey === 'd' || normalizedKey === 'в') {
            inputState.progress = -value
        }
    }

    window.addEventListener('keydown', (event) => {
        setKeyboardInput(event.key, true)
    })

    window.addEventListener('keyup', (event) => {
        setKeyboardInput(event.key, false)
    })

    if (typeof window.DeviceOrientationEvent !== 'undefined'
        && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
        enableTiltControls()
    }

    thirdSection?.addEventListener('touchstart', () => {
        enableTiltControls()
    }, { once: true, passive: true })

    thirdSection?.addEventListener('click', () => {
        enableTiltControls()
    }, { once: true })

    window.addEventListener('resize', () => {
        if (thirdTubeState.active) {
            renderThirdTube()
        }
    })

    updateThirdTubeMovement()
    ensureVectorPath()

    if (sectionText) {
        const rawText = sectionText.dataset.text || ''
        const words = rawText.trim().split(' ').filter(Boolean)

        sectionText.replaceChildren()

        words.forEach((word, index) => {
            const wordEl = document.createElement('span')
            wordEl.className = 'word'
            wordEl.textContent = word
            sectionText.appendChild(wordEl)

            window.setTimeout(() => {
                wordEl.classList.add('is-visible')
            }, 200 * index)
        })
    }

    const setStatus = (message) => {
        if (statusEl) {
            statusEl.textContent = message
        }
    }

    const getImageSourceFromData = (data) => {
        const imageUrl = data?.image_url || data?.url || data?.image
        const imageBase64 = data?.image_base64 || data?.b64 || data?.base64

        if (imageUrl && typeof imageUrl === 'string') {
            return imageUrl
        }

        if (imageBase64 && typeof imageBase64 === 'string') {
            return imageBase64.startsWith('data:image')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`
        }

        return null
    }

    const openTubeForm = () => {
        if (!promptForm || !tube) {
            return
        }

        promptForm.hidden = false
        tube.setAttribute('aria-expanded', 'true')
        promptInput?.focus()
    }

    const closeTubeForm = () => {
        if (!promptForm || !tube) {
            return
        }

        promptForm.hidden = true
        tube.setAttribute('aria-expanded', 'false')
    }

    const scheduleTubeFlyAway = () => {
        if (!tube) {
            return
        }

        if (tubeFlyAwayTimeoutId) {
            window.clearTimeout(tubeFlyAwayTimeoutId)
        }

        tube.classList.remove('is-flying')
        void tube.offsetWidth
        section2Text?.classList.remove('is-visible')

        tubeFlyAwayTimeoutId = window.setTimeout(() => {
            section2Text?.classList.remove('is-visible')
            void section2Text?.offsetWidth
            section2Text?.classList.add('is-visible')
            tube.classList.add('is-flying')
        }, 5000)
    }

    tube?.addEventListener('animationend', () => {
        if (!tube.classList.contains('is-flying')) {
            return
        }

        window.setTimeout(() => {
            thirdSection?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
            activateThirdTube()
        }, 2000)
    })

    if (fruits.length && firstSection) {
        const fruitStates = []

        const randomSpeed = () => 0.5 + Math.random() * 1.2

        const initializeFruitStates = () => {
            const sectionRect = firstSection.getBoundingClientRect()
            fruitStates.length = 0

            fruits.forEach((fruit) => {
                if (fruit.style.display === 'none') {
                    return
                }

                const fruitRect = fruit.getBoundingClientRect()
                const speed = randomSpeed()
                const direction = Math.random() * Math.PI * 2

                const state = {
                    fruit,
                    x: fruitRect.left - sectionRect.left,
                    y: fruitRect.top - sectionRect.top,
                    vx: Math.cos(direction) * speed,
                    vy: Math.sin(direction) * speed,
                    angle: Math.random() * 360,
                    spin: (Math.random() - 0.5) * 1.8,
                }

                fruit.style.left = `${state.x}px`
                fruit.style.top = `${state.y}px`
                fruit.style.transform = `rotate(${state.angle}deg)`
                fruitStates.push(state)
            })
        }

        const animateFruits = () => {
            const maxWidth = firstSection.clientWidth
            const maxHeight = firstSection.clientHeight

            fruitStates.forEach((state) => {
                const { fruit } = state
                if (fruit.classList.contains('is-leaving') || fruit.style.display === 'none') {
                    return
                }

                const fruitWidth = fruit.offsetWidth
                const fruitHeight = fruit.offsetHeight

                state.x += state.vx
                state.y += state.vy

                const limitX = Math.max(0, maxWidth - fruitWidth)
                const limitY = Math.max(0, maxHeight - fruitHeight)

                if (state.x <= 0) {
                    state.x = 0
                    state.vx = randomSpeed()
                } else if (state.x >= limitX) {
                    state.x = limitX
                    state.vx = -randomSpeed()
                }

                if (state.y <= 0) {
                    state.y = 0
                    state.vy = randomSpeed()
                } else if (state.y >= limitY) {
                    state.y = limitY
                    state.vy = -randomSpeed()
                }

                state.angle += state.spin
                fruit.style.left = `${state.x}px`
                fruit.style.top = `${state.y}px`
                fruit.style.transform = `rotate(${state.angle}deg)`
            })

            requestAnimationFrame(animateFruits)
        }

        const clampOnResize = () => {
            const maxWidth = firstSection.clientWidth
            const maxHeight = firstSection.clientHeight

            fruitStates.forEach((state) => {
                const { fruit } = state
                if (fruit.style.display === 'none') {
                    return
                }

                const limitX = Math.max(0, maxWidth - fruit.offsetWidth)
                const limitY = Math.max(0, maxHeight - fruit.offsetHeight)
                state.x = Math.min(Math.max(0, state.x), limitX)
                state.y = Math.min(Math.max(0, state.y), limitY)
                fruit.style.left = `${state.x}px`
                fruit.style.top = `${state.y}px`
            })
        }

        const startFlight = () => {
            if (firstSection.clientWidth === 0 || firstSection.clientHeight === 0) {
                requestAnimationFrame(startFlight)
                return
            }

            initializeFruitStates()
            requestAnimationFrame(animateFruits)
        }

        window.addEventListener('resize', clampOnResize)
        startFlight()
    }

    if (fruits.length && sceneButton && sceneButtonImage) {
        const updateSceneButton = () => {
            const isActive = selectedFruits.size > 0
            sceneButton.disabled = !isActive
            sceneButtonImage.src = sceneButtonPressed ? 'assets/buttonon.svg' : 'assets/buttonoff.svg'
            sceneButton.dataset.state = sceneButtonPressed ? 'on' : 'off'
            sceneButton.setAttribute('aria-pressed', sceneButtonPressed ? 'true' : 'false')
        }

        fruits.forEach((fruit) => {
            fruit.addEventListener('click', () => {
                if (fruit.classList.contains('is-leaving')) {
                    return
                }

                sceneButtonPressed = false

                if (selectedFruits.has(fruit)) {
                    selectedFruits.delete(fruit)
                    fruit.classList.remove('is-selected')
                } else {
                    selectedFruits.add(fruit)
                    fruit.classList.add('is-selected')
                }

                updateSceneButton()
            })
        })

        sceneButton.addEventListener('click', () => {
            if (selectedFruits.size === 0) {
                return
            }

            sceneButtonPressed = true
            sceneButton.disabled = true

            selectedFruits.forEach((fruit) => {
                fruit.classList.remove('is-selected')
                fruit.classList.add('is-leaving')
                fruit.addEventListener('animationend', () => {
                    fruit.style.display = 'none'
                }, { once: true })
            })

            selectedFruits.clear()
            updateSceneButton()

            window.setTimeout(() => {
                secondSection?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                })
            }, 1000)
        })

        updateSceneButton()
    }

    if (tube && promptForm) {
        tube.addEventListener('click', () => {
            openTubeForm()
        })

        document.addEventListener('click', (event) => {
            if (promptForm.hidden) {
                return
            }

            if (promptForm.contains(event.target) || tube.contains(event.target)) {
                return
            }

            closeTubeForm()
        })
    }

    if (!promptForm || !promptInput || !tube || !tubeOverlay || !promptSubmit) {
        return
    }

    promptForm.addEventListener('submit', async (event) => {
        event.preventDefault()

        const prompt = promptInput.value.trim()
        if (!prompt) {
            setStatus('Введите prompt.')
            return
        }

        setStatus('Генерация...')
        promptSubmit.disabled = true

        try {
            const response = await fetch('https://72.56.18.58:8443/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const contentType = response.headers.get('content-type') || ''

            if (contentType.includes('application/json')) {
                const data = await response.json()
                const imageSource = getImageSourceFromData(data)
                if (!imageSource) {
                    throw new Error('JSON без поля изображения')
                }
                applyGeneratedTubeImage(imageSource)
            } else if (contentType.startsWith('image/')) {
                const imageBlob = await response.blob()
                const imageUrl = URL.createObjectURL(imageBlob)
                applyGeneratedTubeImage(imageUrl)
            } else {
                throw new Error(`Неизвестный content-type: ${contentType}`)
            }

            setStatus('Готово.')
            closeTubeForm()
            scheduleTubeFlyAway()
        } catch (error) {
            console.error('Generate request failed:', error)
            applyFallbackTubeAppearance()
            setStatus('Генерация недоступна, используем белый тюбик.')
            closeTubeForm()
            scheduleTubeFlyAway()
        } finally {
            promptSubmit.disabled = false
        }
    })
})
