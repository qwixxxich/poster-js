document.addEventListener('DOMContentLoaded', () => {
    const promptForm = document.getElementById('prompt-form');
    const promptInput = document.getElementById('prompt-input');
    const statusEl = document.getElementById('status');
    const resultImage = document.getElementById('result-image');
    const firstSection = document.getElementById('first');
    const sceneButton = document.getElementById('scene-button');
    const sceneButtonImage = document.getElementById('scene-button-image');
    const fruits = Array.from(document.querySelectorAll('.fruit'));
    const selectedFruits = new Set();
    let sceneButtonPressed = false;

    const setStatus = (message) => {
        statusEl.textContent = message;
    };

    const renderImageFromData = (data) => {
        const imageUrl = data?.image_url || data?.url || data?.image;
        const imageBase64 = data?.image_base64 || data?.b64 || data?.base64;

        if (imageUrl && typeof imageUrl === 'string') {
            resultImage.src = imageUrl;
            resultImage.hidden = false;
            return true;
        }

        if (imageBase64 && typeof imageBase64 === 'string') {
            resultImage.src = imageBase64.startsWith('data:image')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`;
            resultImage.hidden = false;
            return true;
        }

        return false;
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
        });

        updateSceneButton();
    }

    promptForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const prompt = promptInput.value.trim();
        if (!prompt) {
            setStatus('Введите prompt.');
            return;
        }

        resultImage.hidden = true;
        setStatus('Генерация...');

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
                const isRendered = renderImageFromData(data);
                if (!isRendered) {
                    throw new Error('JSON без поля изображения');
                }
            } else if (contentType.startsWith('image/')) {
                const imageBlob = await response.blob();
                resultImage.src = URL.createObjectURL(imageBlob);
                resultImage.hidden = false;
            } else {
                throw new Error(`Неизвестный content-type: ${contentType}`);
            }

            setStatus('Готово.');
        } catch (error) {
            setStatus(`Ошибка: ${error.message}`);
        }
    });
});
