document.addEventListener('DOMContentLoaded', () => {
    const tube = document.getElementById('tube');
    const tubeOverlay = document.getElementById('tube-overlay');
    const promptForm = document.getElementById('tube-form');
    const promptInput = document.getElementById('prompt-input');
    const statusEl = document.getElementById('status');
    const firstSection = document.getElementById('first');
    const secondSection = document.getElementById('second');
    const sceneButton = document.getElementById('scene-button');
    const sceneButtonImage = document.getElementById('scene-button-image');
    const promptSubmit = document.getElementById('prompt-submit');
    const sectionText = document.getElementById('section1-text');
    const fruits = Array.from(document.querySelectorAll('.fruit'));
    const selectedFruits = new Set();
    let sceneButtonPressed = false;
    let tubeFlyAwayTimeoutId = null;

    if (sectionText) {
        const rawText = sectionText.dataset.text || '';
        const words = rawText.trim().split(' ').filter(Boolean);

        sectionText.replaceChildren();

        words.forEach((word, index) => {
            const wordEl = document.createElement('span');
            wordEl.className = 'word';
            wordEl.textContent = word;
            sectionText.appendChild(wordEl);

            window.setTimeout(() => {
                wordEl.classList.add('is-visible');
            }, 200 * index);
        });
    }

    const setStatus = (message) => {
        if (statusEl) {
            statusEl.textContent = message;
        }
    };

    const getImageSourceFromData = (data) => {
        const imageUrl = data?.image_url || data?.url || data?.image;
        const imageBase64 = data?.image_base64 || data?.b64 || data?.base64;

        if (imageUrl && typeof imageUrl === 'string') {
            return imageUrl;
        }

        if (imageBase64 && typeof imageBase64 === 'string') {
            return imageBase64.startsWith('data:image')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`;
        }

        return null;
    };

    const openTubeForm = () => {
        if (!promptForm || !tube) {
            return;
        }

        promptForm.hidden = false;
        tube.setAttribute('aria-expanded', 'true');
        promptInput?.focus();
    };

    const closeTubeForm = () => {
        if (!promptForm || !tube) {
            return;
        }

        promptForm.hidden = true;
        tube.setAttribute('aria-expanded', 'false');
    };

    const scheduleTubeFlyAway = () => {
        if (!tube) {
            return;
        }

        if (tubeFlyAwayTimeoutId) {
            window.clearTimeout(tubeFlyAwayTimeoutId);
        }

        tube.classList.remove('is-flying');
        void tube.offsetWidth;

        tubeFlyAwayTimeoutId = window.setTimeout(() => {
            tube.classList.add('is-flying');
        }, 5000);
    };

    if (fruits.length && firstSection) {
        const fruitStates = [];

        const randomSpeed = () => 0.5 + Math.random() * 1.2;

        const initializeFruitStates = () => {
            const sectionRect = firstSection.getBoundingClientRect();
            fruitStates.length = 0;

            fruits.forEach((fruit) => {
                if (fruit.style.display === 'none') {
                    return;
                }

                const fruitRect = fruit.getBoundingClientRect();
                const speed = randomSpeed();
                const direction = Math.random() * Math.PI * 2;

                const state = {
                    fruit,
                    x: fruitRect.left - sectionRect.left,
                    y: fruitRect.top - sectionRect.top,
                    vx: Math.cos(direction) * speed,
                    vy: Math.sin(direction) * speed,
                    angle: Math.random() * 360,
                    spin: (Math.random() - 0.5) * 1.8,
                };

                fruit.style.left = `${state.x}px`;
                fruit.style.top = `${state.y}px`;
                fruit.style.transform = `rotate(${state.angle}deg)`;
                fruitStates.push(state);
            });
        };

        const animateFruits = () => {
            const maxWidth = firstSection.clientWidth;
            const maxHeight = firstSection.clientHeight;

            fruitStates.forEach((state) => {
                const { fruit } = state;
                if (fruit.classList.contains('is-leaving') || fruit.style.display === 'none') {
                    return;
                }

                const fruitWidth = fruit.offsetWidth;
                const fruitHeight = fruit.offsetHeight;

                state.x += state.vx;
                state.y += state.vy;

                const limitX = Math.max(0, maxWidth - fruitWidth);
                const limitY = Math.max(0, maxHeight - fruitHeight);

                if (state.x <= 0) {
                    state.x = 0;
                    state.vx = randomSpeed();
                } else if (state.x >= limitX) {
                    state.x = limitX;
                    state.vx = -randomSpeed();
                }

                if (state.y <= 0) {
                    state.y = 0;
                    state.vy = randomSpeed();
                } else if (state.y >= limitY) {
                    state.y = limitY;
                    state.vy = -randomSpeed();
                }

                state.angle += state.spin;
                fruit.style.left = `${state.x}px`;
                fruit.style.top = `${state.y}px`;
                fruit.style.transform = `rotate(${state.angle}deg)`;
            });

            requestAnimationFrame(animateFruits);
        };

        const clampOnResize = () => {
            const maxWidth = firstSection.clientWidth;
            const maxHeight = firstSection.clientHeight;

            fruitStates.forEach((state) => {
                const { fruit } = state;
                if (fruit.style.display === 'none') {
                    return;
                }

                const limitX = Math.max(0, maxWidth - fruit.offsetWidth);
                const limitY = Math.max(0, maxHeight - fruit.offsetHeight);
                state.x = Math.min(Math.max(0, state.x), limitX);
                state.y = Math.min(Math.max(0, state.y), limitY);
                fruit.style.left = `${state.x}px`;
                fruit.style.top = `${state.y}px`;
            });
        };

        const startFlight = () => {
            if (firstSection.clientWidth === 0 || firstSection.clientHeight === 0) {
                requestAnimationFrame(startFlight);
                return;
            }

            initializeFruitStates();
            requestAnimationFrame(animateFruits);
        };

        window.addEventListener('resize', clampOnResize);
        startFlight();
    }

    if (fruits.length && sceneButton && sceneButtonImage) {
        const updateSceneButton = () => {
            const isActive = selectedFruits.size > 0;
            sceneButton.disabled = !isActive;
            sceneButtonImage.src = sceneButtonPressed ? 'assets/buttonon.svg' : 'assets/buttonoff.svg';
            sceneButton.dataset.state = sceneButtonPressed ? 'on' : 'off';
            sceneButton.setAttribute('aria-pressed', sceneButtonPressed ? 'true' : 'false');
        };

        fruits.forEach((fruit) => {
            fruit.addEventListener('click', () => {
                if (fruit.classList.contains('is-leaving')) {
                    return;
                }

                sceneButtonPressed = false;

                if (selectedFruits.has(fruit)) {
                    selectedFruits.delete(fruit);
                    fruit.classList.remove('is-selected');
                } else {
                    selectedFruits.add(fruit);
                    fruit.classList.add('is-selected');
                }

                updateSceneButton();
            });
        });

        sceneButton.addEventListener('click', () => {
            if (selectedFruits.size === 0) {
                return;
            }

            sceneButtonPressed = true;
            sceneButton.disabled = true;

            selectedFruits.forEach((fruit) => {
                fruit.classList.remove('is-selected');
                fruit.classList.add('is-leaving');
                fruit.addEventListener('animationend', () => {
                    fruit.style.display = 'none';
                }, { once: true });
            });

            selectedFruits.clear();
            updateSceneButton();

            window.setTimeout(() => {
                secondSection?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }, 1000);
        });

        updateSceneButton();
    }

    if (tube && promptForm && secondSection) {
        tube.addEventListener('click', () => {
            openTubeForm();
        });

        secondSection.addEventListener('click', (event) => {
            if (promptForm.hidden) {
                return;
            }

            if (promptForm.contains(event.target) || tube.contains(event.target)) {
                return;
            }

            closeTubeForm();
        });
    }

    if (!promptForm || !promptInput || !tube || !tubeOverlay || !promptSubmit) {
        return;
    }

    promptForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const prompt = promptInput.value.trim();
        if (!prompt) {
            setStatus('Введите prompt.');
            return;
        }

        setStatus('Генерация...');
        promptSubmit.disabled = true;

        try {
            const response = await fetch('http://72.56.18.58:8000/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const data = await response.json();
                const imageSource = getImageSourceFromData(data);
                if (!imageSource) {
                    throw new Error('JSON без поля изображения');
                }
                tubeOverlay.style.backgroundImage = `url(${JSON.stringify(imageSource)})`;
            } else if (contentType.startsWith('image/')) {
                const imageBlob = await response.blob();
                const imageUrl = URL.createObjectURL(imageBlob);
                tubeOverlay.style.backgroundImage = `url(${JSON.stringify(imageUrl)})`;
            } else {
                throw new Error(`Неизвестный content-type: ${contentType}`);
            }

            setStatus('Готово.');
            closeTubeForm();
            scheduleTubeFlyAway();
        } catch (error) {
            setStatus(`Ошибка: ${error.message}`);
        } finally {
            promptSubmit.disabled = false;
        }
    });
});
