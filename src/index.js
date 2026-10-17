import songUrl from './assets/pink_robin-song.m4a';

const robin = document.querySelector('#robin');
const song = new Audio(songUrl);

robin.addEventListener('click', () => {
    song.currentTime = 0;
    song.play().catch((error) => console.error('Could not play the robin song:', error));

    robin.classList.remove('animate-robin');
    // Force a style update so repeated clicks restart the CSS animation.
    void robin.offsetWidth;
    robin.classList.add('animate-robin');
});
