# Numerical Area & Volume Calculator

A second-year BTech Computational Methods project using composite Trapezoidal,
Simpson's 1/3, and Simpson's 3/8 rules. It includes a browser calculator and a
separate C++ terminal calculator, with 15 predefined functions, measured data,
method comparisons, and calculation steps.

## Run in a browser

Keep the three files in `web/` together, then open `web/index.html`
directly in a modern browser. No installation, server, framework, or network is
required. Choose an input mode, Area or Volume, and a method. Click Calculate
after editing inputs; changing the method recalculates immediately.

- Function mode uses the selected function and limits. Domain restrictions are
  checked before evaluation.
- Given Values assumes equally spaced measurements: `n = number of values - 1`.
  Enter decimal numbers separated by commas or spaces, and positive spacing `h`.
- For **Area**, the ordinates are y-values. The result is a **signed integral**:
  values below the x-axis contribute negatively, rather than giving total
  geometric area.
- For **Volume**, the solid rotates about the x-axis: `V = pi * integral(r² dx)`.
  Given Values therefore expects **nonnegative radii**, not cross-sectional areas
  or already squared radii. Both calculators square the radii before integration.
  The measured-volume graph shows the interpolated `r²` integrand.
- Measured data alone do not determine an exact analytical integral. Without a
  reference, exact value and error are unavailable. An optional reference must
  refer to the **final area or volume**; the display reports absolute difference
  from that reference, rather than claiming a known analytical error.

## Numerical methods

For `n` equal intervals, `h = (b-a)/n`, and ordinates `y0 ... yn`:

| Method | Composite formula | Requirement |
|---|---|---|
| Trapezoidal | `(h/2)[y0 + yn + 2*sum(interior y)]` | `n >= 1` |
| Simpson's 1/3 | `(h/3)[y0 + yn + 4*sum(odd interior y) + 2*sum(even interior y)]` | positive even `n` |
| Simpson's 3/8 | `(3h/8)[y0 + yn + 3*sum(interior y not divisible by 3) + 2*sum(interior y divisible by 3)]` | positive `n` divisible by 3 |

The browser draws straight chords, quadratic pieces through groups of 3 points,
and cubic pieces through groups of 4 points respectively. Group sizes are 1, 2,
and 3 intervals. The dashed blue curve is the original function; green, orange,
and purple distinguish the methods. These curves can coincide for simple
polynomials: that is mathematically correct. Volume slices illustrate sampling
groups; they are not an exact rendering of quadrature weights.

Absolute error is `abs(approximation - analytical value)`. Outputs are rounded to
four decimal places; calculations use full floating-point precision.

## Compile and run C++

A C++17 compiler is required. In the project directory, with GCC available:

```powershell
g++ -std=c++17 -Wall -Wextra cpp/src/main.cpp cpp/src/trapezoidal.cpp cpp/src/simpson13.cpp cpp/src/simpson38.cpp -o calculator.exe
.\calculator.exe
```

On Linux/macOS, use `-o calculator`, then `./calculator`. Compile **all four**
`.cpp` files together. The browser and C++ programs are independent; the webpage
does not invoke the executable. Both limit input to 1–1000 intervals.

## Project structure and viva guide

```text
area-and-volume/
├── cpp/
│   ├── include/
│   │   └── methods.h
│   └── src/
│       ├── main.cpp
│       ├── trapezoidal.cpp
│       ├── simpson13.cpp
│       └── simpson38.cpp
├── web/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── tests/
│   └── tests.js
├── docs/
│   └── flowchart.svg
└── README.md
```

The local project folder can remain named `cm`; the layout above represents the
GitHub repository. Run build and test commands from the project root. Each C++
source includes `../include/methods.h`; browser assets use paths relative to
`web/index.html`. Test file paths are resolved relative to the test script, so
the checks also work when invoked from another directory.

| File | Purpose / functions to study |
|---|---|
| `web/index.html` | Two-panel input and result structure; links the CSS and JavaScript |
| `web/style.css` | Layout, responsive sizing, themes, table, and step styling |
| `web/script.js` | `integrateValues` implements all three formulas; `checkRule` checks interval constraints; `readNumber`, `parseMeasurements`, and `checkDomain` validate input; `run` connects input to results; `clearResults` clears stale outputs |
| `web/script.js` (graphs) | `lagrange` evaluates the interpolation polynomial; `interpolationBounds` estimates graph bounds; `drawArea`, `drawValuesGraph`, and `drawVolume` render graphs; `updateSteps` explains substitution |
| `cpp/src/main.cpp` | `main` controls the terminal menu; `makeShapes` stores f, its antiderivative F, and the antiderivative G of f²; `validDomain` checks limits; input helpers reject invalid data; `displaySteps` explains formulas |
| `cpp/include/methods.h` | C++ integration function declarations shared across source files |
| `cpp/src/trapezoidal.cpp` | `integrateTrapezoidal`: endpoint weights 1, interior weights 2 |
| `cpp/src/simpson13.cpp` | `integrateSimpson13`: interior weights alternate 4, 2 |
| `cpp/src/simpson38.cpp` | `integrateSimpson38`: interior weights repeat 3, 3, 2 |
| `docs/flowchart.svg` | Existing calculator workflow diagram |
| `tests/tests.js` | Optional numerical and interaction checks using only Node.js built-ins |

For the viva, explain why Simpson's rules require pairs/triples of intervals,
why volume integrates **f²** and multiplies by **pi**, how `F(b)-F(a)` gives an
analytical integral, and why measured data require a separate reference to assess
accuracy. Interpolation passes through sample points; it does not recover an
unknown original function.

## Verification

Optional automated checks (Node.js is needed only for these checks):

```powershell
node --check web/script.js
node tests/tests.js
```

Known examples on `[0,1]`, using `n=6`:

| Integral | Trapezoidal | Simpson 1/3 | Simpson 3/8 | Analytical |
|---|---|---|---|---|
| x | 0.5000 | 0.5000 | 0.5000 | 1/2 |
| x² | 0.3380 | 0.3333 | 0.3333 | 1/3 |
| x³ | 0.2569 | 0.2500 | 0.2500 | 1/4 |

Measured radii `0,1,2`, `h=1`, Simpson 1/3: volume `8*pi/3 = 8.3776`.
The checks also cover malformed numbers, invalid methods, domain restrictions,
stale results, selected comparison rows, references, and interpolation overshoot.
They use a small DOM/canvas substitute, so they do not verify pixel appearance.

In the implementation environment these checks passed. No C++ compiler was
found, so compilation and terminal execution remain unverified. A headless Edge
direct-file check was attempted but Edge exited during startup with system
encryption errors. The initial browser test was subsequently completed manually
by the project author before this folder reorganization.

Source files, documentation, tests, and the workflow diagram are included for
GitHub. There is no `.gitignore`; keep generated binaries, build outputs, backups,
and local editor files out of commits by staging only the intended project files.
