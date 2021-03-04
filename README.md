> A Javascript to C code transpiler

# Goal
Convert Javascript to (Arduino) C code.

**From**
```js
function setup() {
  pinMode(LED_BUILTIN, OUTPUT)
}

function loop() {
  digitalWrite(LED_BUILTIN, HIGH)   // turn the LED on (HIGH is the voltage level)
  delay(1000)                       // wait for a second
  digitalWrite(LED_BUILTIN, LOW)    // turn the LED off by making the voltage LOW
  delay(1000)                       // wait for a second
}
```
**To**
```c
// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(1000);                       // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(1000);                       // wait for a second
}
```

# Why
- Javascript is a bit easier than C.
- Creating a program in Javascript can be run in the browser. Which could pave way for an online simulator.

# Platforms
## Arduino
Pin defines https://github.com/arduino/ArduinoCore-avr/blob/master/variants/standard/pins_arduino.h

# Based on
- AST parser from esprima https://esprima.readthedocs.io/en/latest/

# Other projects
- Based on esprima and estree https://github.com/timruffles/js-to-c
- https://andrei-markeev.github.io/ts2c/

