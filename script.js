document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const section = document.getElementById('first');
    const text = document.querySelector('.mockup');

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;

        const percent = scrollTop / maxScroll;

        video.currentTime = video.duration * percent;

        // if (video.currentTime === video.duration) {
        //     video.hidden = true
        //     text.hidden = false
        // }
    });
})
