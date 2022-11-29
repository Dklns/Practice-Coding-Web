function stare(e) {
    const eyes = document.querySelectorAll('.eye');
    eyes.forEach(eye => {
        const rect = eye.getBoundingClientRect();
        const x = rect.left + eye.clientWidth / 2
        const y = rect.top + eye.clientHeight / 2

        const radian = Math.atan2(y - e.pageY, x - e.pageX);
        const rotation = (180 / Math.PI) * radian;

        eye.style.transform = `rotate(${rotation}deg)`;
    })
}

document.body.addEventListener('mousemove', stare, false);