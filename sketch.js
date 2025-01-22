let walls = [];
let particles = [];
let wallCount = 5;
let rayCount = 1; // Between 0-1 is best but it can be 0-X
let maxBounces = 3; // Maximum number of ray bounces
let creatingWall = false;
let tempWallStart;
let gameOver = false;
let lineCount = 0; // Count of new lines created
let showStartText = true; // Show initial text

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Generate random walls
  for (let i = 0; i < wallCount; i++) {
    let x1 = random(width);
    let x2 = random(width);
    let y1 = random(height);
    let y2 = random(height);
    walls[i] = new Boundary(x1, y1, x2, y2);
  }

  // Outlines
  walls.push(new Boundary(-1, -1, width, -1));
  walls.push(new Boundary(width, -1, width, height));
  walls.push(new Boundary(width, height, -1, height));
  walls.push(new Boundary(-1, height, -1, -1));

  // Create multiple particles
  for (let i = 0; i < 3; i++) {
    particles.push(new Particle(random(width), random(height)));
  }

  noCursor();
}

function draw() {
  if (gameOver) {
    background(255, 182, 193); // Pink background
    fill(255); // White text
    textSize(48);
    textAlign(CENTER, CENTER);
    text("Game Over!", width / 2, height / 2);
    return;
  }

  background(255, 182, 193, 220); // Pink semi-transparent background for persistent trails

  // Show start text
  if (showStartText) {
    fill(255); // White text
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Click to create new lines", width / 2, height / 2 - 30);
    text("Be careful with crossing them", width / 2, height / 2 + 30);
    return;
  }

  // Draw walls
  for (let wall of walls) {
    wall.show();
  }

  // Update and draw particles
  for (let particle of particles) {
    particle.automaticMovement();
    particle.show();
    particle.look(walls);
  }

  // Draw temporary wall during creation
  if (creatingWall && tempWallStart) {
    stroke(255, 100); // White line
    line(tempWallStart.x, tempWallStart.y, mouseX, mouseY);
  }

  // Display line count
  fill(255); // White text
  textSize(16);
  textAlign(LEFT, TOP);
  text(`Lines Created: ${lineCount}`, 10, 10);
}

function mousePressed() {
  if (gameOver) return;

  // Start creating a wall
  creatingWall = true;
  tempWallStart = createVector(mouseX, mouseY);

  // Hide start text after first interaction
  showStartText = false;
}

function mouseReleased() {
  if (gameOver || !creatingWall || !tempWallStart) return;

  // Finish creating a wall
  let newWall = new Boundary(tempWallStart.x, tempWallStart.y, mouseX, mouseY);

  // Check for intersections with existing walls
  for (let wall of walls) {
    if (checkIntersection(newWall, wall)) {
      gameOver = true;
      return;
    }
  }

  walls.push(newWall);
  lineCount++; // Increment line count
  creatingWall = false;
  tempWallStart = null;
}

/////////////////////////////////////////////// Walls
class Boundary {
  constructor(x1, y1, x2, y2) {
    this.a = createVector(x1, y1);
    this.b = createVector(x2, y2);
  }

  show() {
    stroke(255); // White walls
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }
}

/////////////////////////////////////////// Rays
class Ray {
  constructor(pos, angle) {
    this.pos = pos;
    this.dir = p5.Vector.fromAngle(angle);
  }

  lookAt(x, y) {
    this.dir.x = x - this.pos.x;
    this.dir.y = y - this.pos.y;
    this.dir.normalize();
  }

  show() {
    stroke(255); // White rays
    push();
    translate(this.pos.x, this.pos.y);
    line(0, 0, this.dir.x * 10, this.dir.y * 10);
    pop();
  }

  cast(wall) {
    const x1 = wall.a.x;
    const y1 = wall.a.y;
    const x2 = wall.b.x;
    const y2 = wall.b.y;

    const x3 = this.pos.x;
    const y3 = this.pos.y;
    const x4 = this.pos.x + this.dir.x;
    const y4 = this.pos.y + this.dir.y;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den == 0) {
      return;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (t > 0 && t < 1 && u > 0) {
      const pt = createVector();
      pt.x = x1 + t * (x2 - x1);
      pt.y = y1 + t * (y2 - y1);
      return pt;
    } else {
      return;
    }
  }
}

//////////////////////////////////////////////////// Particles
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.rays = [];
    for (let a = 0; a < 360; a += rayCount) {
      this.rays.push(new Ray(this.pos, radians(a)));
    }
  }

  update(x, y) {
    this.pos.set(x, y);
  }

  automaticMovement() {
    // Move the particle in a smooth, random direction using Perlin noise
    this.pos.x += map(noise(frameCount * 0.01, this.pos.y), 0, 1, -2, 2);
    this.pos.y += map(noise(frameCount * 0.01, this.pos.x), 0, 1, -2, 2);

    // Keep particle within bounds
    this.pos.x = constrain(this.pos.x, 0, width);
    this.pos.y = constrain(this.pos.y, 0, height);
  }

  look(walls) {
    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      let closest = null;
      let record = Infinity;

      let currentPos = ray.pos.copy();
      let currentDir = ray.dir.copy();
      for (let b = 0; b < maxBounces; b++) {
        let foundIntersection = false;

        for (let wall of walls) {
          const pt = ray.cast(wall);
          if (pt) {
            const d = p5.Vector.dist(currentPos, pt);
            if (d < record) {
              record = d;
              closest = pt;
              currentDir = p5.Vector.sub(pt, currentPos).normalize();
              foundIntersection = true;
            }
          }
        }

        if (closest) {
          // Draw ray
          stroke(255, 150 - b * 50); // Fade with bounces
          line(currentPos.x, currentPos.y, closest.x, closest.y);

          // Update position to bounce point
          currentPos = closest.copy();
          ray.dir = currentDir.copy();
        }

        if (!foundIntersection) {
          break;
        }
      }
    }
  }

  show() {
    fill(255); // White particle
    noStroke();
    ellipse(this.pos.x, this.pos.y, 4);
  }
}

// Check if two walls intersect
function checkIntersection(wall1, wall2) {
  const x1 = wall1.a.x;
  const y1 = wall1.a.y;
  const x2 = wall1.b.x;
  const y2 = wall1.b.y;
  const x3 = wall2.a.x;
  const y3 = wall2.a.y;
  const x4 = wall2.b.x;
  const y4 = wall2.b.y;

  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den === 0) {
    return false; // Lines are parallel
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

  // Check if the intersection point lies on both line segments
  if (t > 0 && t < 1 && u > 0 && u < 1) {
    return true; // The walls intersect
  }

  return false; // No intersection
}

