let canvas = document.getElementById('id-canvas');
let context = canvas.getContext('2d');
context.font = "150px Courier";
context.fillStyle = 'rgb(200,200,200)';
context.textBaseline = 'middle';

let letters = ['w', 'e', 'l', 'c', 'o', 'm', 'e']
let velocities = []
let init = -7.4
let relative_pos = []
let acceleration = 0.3
let base_y = 150
let cnt = 0
let bounce = 0

for (let i = 0; i < letters.length; i++) {
    velocities.push(init);
    relative_pos.push(0);
}


function animate() {
    cnt++
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < letters.length; i++) {
        if (cnt > i * 3) {
            relative_pos[i] += velocities[i];
            velocities[i] += acceleration;
            if (relative_pos[i] > 0 && velocities[i] > 0) {
                bounce ++
                if (init + 0.05 * bounce > 0) {
                    velocities[i] = 0
                }
                else {
                    velocities[i] = init + 0.05 * bounce
                }

            }
        }
        context.fillText(letters[i], 150 + i * 100, base_y + relative_pos[i]);
    }
    if (velocities[0] !== 0 || relative_pos[0] < 0) {
        requestAnimationFrame(animate)
    }
}

requestAnimationFrame(animate);
