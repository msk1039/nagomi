# How Nagomi works

Nagomi is an interactive koi pond. The fish are not videos, GIFs, or a long
list of drawings. The program decides how they move and draws their current
shape while it is running.

You do not need animation or graphics knowledge to understand this guide.

## What “procedural” means

A traditional animation is like playing a recorded dance. Every movement was
prepared earlier.

A procedural animation is more like giving a dancer a set of rules:

- Move calmly most of the time.
- Keep some distance from other dancers.
- Avoid the edge of the stage.
- Turn toward a point when the visitor taps it.
- Move the body more strongly when moving faster.

The computer applies these rules many times each second. The result looks
alive because the next pose comes from the current situation, not from a
repeating animation clip.

Nagomi is a rule-based simulation. It is not an AI model, a biological koi
simulation, or a complete simulation of real water.

## The short version

Every displayed frame follows the same pipeline:

```text
visitor input
     ↓
fish decisions → movement → flexible body shape
     ↓
pond bed → shadows → fish → water → plants → weather
     ↓
final pixels on the screen
```

The simulation and drawing code are separate. The simulation answers “where
should the fish be?” The renderer answers “what should that look like?”

## 1. Each fish has its own state

Every koi stores values such as its position, direction, speed, size, depth,
and personality. It also has one current swimming state:

| State | What you see |
| --- | --- |
| Glide | Normal, relaxed swimming |
| Coast | Slowing down with little tail movement |
| Hover | Almost staying in one place |
| Burst | A short, fast movement |
| Pivot | A slower but sharper turn |

Each fish changes state at a different time. It also starts with slightly
different speed, size, turning strength, and responsiveness. This is why the
school does not move as one synchronized group.

The random choices use repeatable number generators. They add variation, but
they do not replace the movement rules or randomly teleport fish around.

## 2. Simple intentions create natural movement

A fish does not select its final path in advance. It combines several small
intentions:

- **Wander:** continue forward with a slow changing turn.
- **Cohesion:** stay loosely connected to nearby fish.
- **Alignment:** prefer a direction similar to nearby fish.
- **Separation:** move away before fish overlap.
- **Edge avoidance:** turn back before leaving the pond.
- **Target following:** move toward the latest tap or click.

These intentions can disagree. For example, a fish can want to follow a tap
while also avoiding another fish. The program gives every intention a weight,
combines them, and turns smoothly toward the result.

The speed and direction are changed gradually. Assigning them instantly would
make the koi look like sliding icons instead of swimming animals.

## 3. A flexible spine creates the swimming pose

Each koi has a chain of 14 invisible points from its head to its tail. This
chain is its procedural spine.

The head follows the movement rules. Every point behind it follows the point
in front while keeping a fixed distance. Points near the tail respond more
loosely, which produces follow-through during a turn.

A sideways wave is then added along the spine. The wave is small near the head
and large near the tail. Faster fish and burst movements increase the tail
effort. The renderer builds the body, fins, markings, and tail around this
changing spine.

This means one fish shape can produce thousands of poses without storing
thousands of images.

## 4. Fish can move through depth

Depth is another changing value on each fish. A shallow fish looks brighter
and closer to the surface. A deeper fish receives stronger water tinting and a
different shadow strength.

Fish spend varying amounts of time near the surface or deeper in the pond.
When you call them with a ripple, they rise toward the surface as they respond.
The depth changes smoothly, so they do not suddenly jump between two visual
styles.

## 5. A tap becomes a pond event

When you tap or click the water:

1. The screen position is converted into the pond’s `480 × 270` coordinate
   system.
2. A ripple starts at that point.
3. Every large koi receives its own response delay.
4. Farther or less reactive fish can respond later.
5. Responding fish enter a burst, rise, and steer toward the point.
6. Tiny fish flee from the disturbance instead.

Near the target, koi receive a small circling force. This keeps them moving
around the ripple instead of stacking directly on top of one another.

## 6. The water is made from layers

Three.js draws the pond in several passes rather than as one flat picture:

1. The pond bed creates the deep and shallow colors.
2. Plant and fish shadows are added in their correct depth order.
3. Large koi and tiny schools are drawn.
4. The water surface adds currents, tint, refraction, and ripple distortion.
5. Lotus leaves, flowers, duckweed, and butterflies are placed above it.
6. The selected weather applies the final light, color, clouds, or rain.

Intermediate render textures let the water distort the underwater scene
without also distorting objects that float above the surface.

Some ripples come from visitors, but others come from rain or a feeding koi.
Fast fish near the surface can also leave a short tail wake.

## 7. Weather and settings change the rules

Weather presets are more than colored filters. A preset supplies final values
for selected pond-bed, current, lighting, and shadow settings. Changing weather
overwrites only those fields and leaves unrelated custom settings alone.

The settings panel edits the same runtime configuration used by the
simulation and renderer. Most visual and movement values live in
[`src/config.ts`](../src/config.ts), while weather-specific values live in
[`src/weather.ts`](../src/weather.ts).

## Why the pond stays responsive

The logical pond is only `480 × 270` pixels and is scaled to the screen. The
simulation uses a fixed 60 updates per second, which keeps movement stable even
when the display frame rate changes.

The renderer also reuses geometry buffers, fish objects, ripples, and render
targets instead of creating new ones every frame. This keeps allocation and
garbage-collection work low.

## Source map

| File | Responsibility |
| --- | --- |
| [`src/app.tsx`](../src/app.tsx) | Runs the update/render loop and handles input and UI |
| [`src/koi.ts`](../src/koi.ts) | Stores the state of one koi |
| [`src/school.ts`](../src/school.ts) | Controls behavior, steering, depth, and interactions |
| [`src/fish-renderer.ts`](../src/fish-renderer.ts) | Builds fish geometry and combines render layers |
| [`src/water-surface.ts`](../src/water-surface.ts) | Draws currents, tint, and surface distortion |
| [`src/ripple-system.ts`](../src/ripple-system.ts) | Manages reusable ripple events |
| [`src/lotus-leaves.ts`](../src/lotus-leaves.ts) | Builds lotus leaves, flowers, and their shadows |
| [`src/weather.ts`](../src/weather.ts) | Defines the visual weather presets |
| [`src/config.ts`](../src/config.ts) | Holds the main tunable values |

The important idea is simple: many small rules run continuously, and their
combined result creates the feeling of a living pond.
