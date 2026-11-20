// Every number that shapes how the marble feels lives here, so the tuning pass
// is one file. The in-game panel edits these live; "Copy values" exports them.
export const tuning = {
  // Marble
  radius: 0.2, // m
  gravity: 20, // m/s^2
  rollAccel: 10, // m/s^2 the marble gains on flat ground at full stick
  maxRollSpeed: 12, // m/s; input stops adding spin past this (slopes can exceed it)
  airAccel: 4, // m/s^2 of direct push while airborne
  jumpSpeed: 7.5, // m/s off the surface; height = jumpSpeed^2 / (2 * gravity)
  friction: 1.0,
  bounce: 0.4, // restitution
  spinDamping: 0.05, // how quickly a free-rolling marble loses spin

  // Camera
  camDistance: 2.6,
  camLift: 0.3, // look-at point above the marble's center
  fov: 70,
  mouseSens: 0.0025, // radians per pixel
  invertY: false,
};

export const DEFAULTS = { ...tuning };
