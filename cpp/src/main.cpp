// main.cpp
// Interactive Terminal Calculator for Numerical Integration (Area & Volume).
// Methods implemented in separate modular files:
//   - Trapezoidal Rule (trapezoidal.cpp)
//   - Simpson's 1/3 Rule (simpson13.cpp)
//   - Simpson's 3/8 Rule (simpson38.cpp)
//
// Compile command:
//   g++ -std=c++17 cpp/src/main.cpp cpp/src/trapezoidal.cpp cpp/src/simpson13.cpp cpp/src/simpson38.cpp -o calculator.exe
// Run command:
//   .\calculator.exe

#include "../include/methods.h"

#include <algorithm>
#include <cstdlib>
#include <regex>
#include <cmath>
#include <functional>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

const double PI = acos(-1.0);

// Safe mathematical bounds to prevent float roundoff NaN
inline double safeSqrt(double x) {
    return sqrt(max(0.0, x));
}

inline double safeAsin(double x) {
    return asin(clamp(x, -1.0, 1.0));
}

// Shape profile structure
struct Shape {
    string name;
    function<double(double)> f;
    function<double(double)> F; // Antiderivative of f
    function<double(double)> G; // Antiderivative of f^2
    double defaultA, defaultB;
    string validRange;
};

vector<Shape> makeShapes() {
    return {
        {"Circle (half)",
         [](double x) { return safeSqrt(1.0 - x * x); },
         [](double x) { return (x * safeSqrt(1.0 - x * x) + safeAsin(x)) / 2.0; },
         [](double x) { return x - pow(x, 3) / 3.0; },
         -1.0, 1.0, "Valid: -1 <= x <= 1"},
        {"Circle (quarter)",
         [](double x) { return safeSqrt(1.0 - x * x); },
         [](double x) { return (x * safeSqrt(1.0 - x * x) + safeAsin(x)) / 2.0; },
         [](double x) { return x - pow(x, 3) / 3.0; },
         0.0, 1.0, "Valid: -1 <= x <= 1"},
        {"Semicircle (radius 2)",
         [](double x) { return safeSqrt(4.0 - x * x); },
         [](double x) { return (x * safeSqrt(4.0 - x * x)) / 2.0 + 2.0 * safeAsin(x / 2.0); },
         [](double x) { return 4.0 * x - pow(x, 3) / 3.0; },
         -2.0, 2.0, "Valid: -2 <= x <= 2"},
        {"Ellipse (half)",
         [](double x) { return safeSqrt(1.0 - (x * x) / 4.0); },
         [](double x) { return (x / 2.0) * safeSqrt(1.0 - (x * x) / 4.0) + safeAsin(x / 2.0); },
         [](double x) { return x - pow(x, 3) / 12.0; },
         -2.0, 2.0, "Valid: -2 <= x <= 2"},
        {"Line (y = x + 1)",
         [](double x) { return x + 1.0; },
         [](double x) { return (x * x) / 2.0 + x; },
         [](double x) { return pow(x, 3) / 3.0 + x * x + x; },
         0.0, 2.0, "Valid: any real x"},
        {"Cone (y = x)",
         [](double x) { return x; },
         [](double x) { return (x * x) / 2.0; },
         [](double x) { return pow(x, 3) / 3.0; },
         0.0, 2.0, "Valid: any real x"},
        {"Parabola (y = x^2)",
         [](double x) { return x * x; },
         [](double x) { return pow(x, 3) / 3.0; },
         [](double x) { return pow(x, 5) / 5.0; },
         0.0, 2.0, "Valid: any real x"},
        {"Cubic (y = x^3)",
         [](double x) { return pow(x, 3); },
         [](double x) { return pow(x, 4) / 4.0; },
         [](double x) { return pow(x, 7) / 7.0; },
         0.0, 1.0, "Valid: any real x"},
        {"Quartic (y = x^4)",
         [](double x) { return pow(x, 4); },
         [](double x) { return pow(x, 5) / 5.0; },
         [](double x) { return pow(x, 9) / 9.0; },
         0.0, 1.0, "Valid: any real x"},
        {"Hyperbola (y = 1/x)",
         [](double x) { return (x != 0.0 ? 1.0 / x : numeric_limits<double>::quiet_NaN()); },
         [](double x) { return log(fabs(x)); },
         [](double x) { return -1.0 / x; },
         1.0, 4.0, "Valid: x > 0 strictly"},
        {"Sine (0 to pi)",
         [](double x) { return sin(x); },
         [](double x) { return -cos(x); },
         [](double x) { return x / 2.0 - sin(2.0 * x) / 4.0; },
         0.0, PI, "Valid: any real x"},
        {"Cosine (0 to pi/2)",
         [](double x) { return cos(x); },
         [](double x) { return sin(x); },
         [](double x) { return x / 2.0 + sin(2.0 * x) / 4.0; },
         0.0, PI / 2.0, "Valid: any real x"},
        {"Exponential (y = e^x)",
         [](double x) { return exp(x); },
         [](double x) { return exp(x); },
         [](double x) { return exp(2.0 * x) / 2.0; },
         0.0, 1.0, "Valid: any real x"},
        {"Logarithm (y = ln x)",
         [](double x) { return (x > 0.0 ? log(x) : numeric_limits<double>::quiet_NaN()); },
         [](double x) { return x * log(x) - x; },
         [](double x) { return x * pow(log(x), 2) - 2.0 * x * log(x) + 2.0 * x; },
         1.0, exp(1.0), "Valid: x > 0 strictly"},
        {"Square root (y = sqrt(x))",
         [](double x) { return (x >= 0.0 ? sqrt(x) : numeric_limits<double>::quiet_NaN()); },
         [](double x) { return (2.0 / 3.0) * pow(x, 1.5); },
         [](double x) { return (x * x) / 2.0; },
         0.0, 4.0, "Valid: x >= 0 strictly"},
    };
}

// End-of-input exits cleanly instead of repeating prompts forever.
string readLine() {
    string line;
    if (!getline(cin, line)) {
        cout << "\nEnd of input. Goodbye!\n";
        exit(0);
    }
    const size_t first = line.find_first_not_of(" \t\r\n");
    if (first == string::npos) return "";
    return line.substr(first, line.find_last_not_of(" \t\r\n") - first + 1);
}

// Complete decimal numbers, including scientific notation; no partial tokens.
bool parseNumber(const string& text, double& value) {
    static const regex decimal(R"([+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)");
    if (!regex_match(text, decimal)) return false;
    try { value = stod(text); } catch (...) { return false; }
    return isfinite(value);
}

double readDouble(const string& prompt, double defaultValue) {
    while (true) {
        cout << prompt;
        string line = readLine();
        if (line.empty()) return defaultValue;
        double value;
        if (parseNumber(line, value)) return value;
        cout << "  [!] Enter a complete, finite number.\n";
    }
}

int readInt(const string& prompt, int defaultValue) {
    while (true) {
        cout << prompt;
        string line = readLine();
        if (line.empty()) return defaultValue;
        double value;
        if (parseNumber(line, value) && value == floor(value) &&
            value >= numeric_limits<int>::min() && value <= numeric_limits<int>::max())
            return static_cast<int>(value);
        cout << "  [!] Enter a whole number.\n";
    }
}

bool validDomain(int shape, double a, double b) {
    if ((shape == 1 || shape == 2) && (a < -1 || b > 1)) return false;
    if ((shape == 3 || shape == 4) && (a < -2 || b > 2)) return false;
    if ((shape == 10 || shape == 14) && a <= 0) return false;
    if (shape == 15 && a < 0) return false;
    return true;
}

// Display step-by-step breakdown
void displaySteps(const vector<double>& ys, double h, int n, int methodChoice, double approx, bool isArea,
                  bool hasExact, double exact, bool hasRef, double refVal) {
    cout << "\n--- Calculation Steps ---\n";
    if (!isArea) cout << "Volume uses ordinates y_i = r_i squared; V = pi * I.\n";
    double endSum = ys[0] + ys[n];

    if (methodChoice == 1) {
        cout << "1. Formula (Trapezoidal Rule):\n"
             << "   I = (h / 2) * [ (y_0 + y_n) + 2 * sum(y_1 ... y_n-1) ]\n";
        double sumMid = 0.0;
        for (int i = 1; i < n; ++i) sumMid += ys[i];
        cout << "2. Given Values:\n"
             << "   n = " << n << ", h = " << fixed << setprecision(4) << h << "\n"
             << "   y_0 + y_n = " << ys[0] << " + " << ys[n] << " = " << endSum << "\n"
             << "   Sum of middle ordinates = " << sumMid << "\n";
        cout << "3. Main Substitution:\n"
             << "   I = (" << h << " / 2) * [ (" << endSum << ") + 2 * (" << sumMid << ") ]\n"
             << "   I = " << (h / 2.0) * (endSum + 2.0 * sumMid) << "\n";
    } else if (methodChoice == 2) {
        cout << "1. Formula (Simpson's 1/3 Rule):\n"
             << "   I = (h / 3) * [ (y_0 + y_n) + 4 * sum(y_odd) + 2 * sum(y_even) ]\n";
        double sumOdd = 0.0, sumEven = 0.0;
        for (int i = 1; i < n; ++i) {
            if (i % 2 == 1) sumOdd += ys[i];
            else sumEven += ys[i];
        }
        cout << "2. Given Values:\n"
             << "   n = " << n << " (even), h = " << fixed << setprecision(4) << h << "\n"
             << "   y_0 + y_n = " << endSum << "\n"
             << "   Odd ordinates sum = " << sumOdd << " (x 4 = " << 4.0 * sumOdd << ")\n"
             << "   Even ordinates sum = " << sumEven << " (x 2 = " << 2.0 * sumEven << ")\n";
        cout << "3. Main Substitution:\n"
             << "   I = (" << h << " / 3) * [ (" << endSum << ") + (" << 4.0 * sumOdd << ") + (" << 2.0 * sumEven << ") ]\n"
             << "   I = " << (h / 3.0) * (endSum + 4.0 * sumOdd + 2.0 * sumEven) << "\n";
    } else if (methodChoice == 3) {
        cout << "1. Formula (Simpson's 3/8 Rule):\n"
             << "   I = (3h / 8) * [ (y_0 + y_n) + 3 * sum(y_not_mult_3) + 2 * sum(y_mult_3) ]\n";
        double sumNot3 = 0.0, sumDiv3 = 0.0;
        for (int i = 1; i < n; ++i) {
            if (i % 3 != 0) sumNot3 += ys[i];
            else sumDiv3 += ys[i];
        }
        cout << "2. Given Values:\n"
             << "   n = " << n << " (divisible by 3), h = " << fixed << setprecision(4) << h << "\n"
             << "   y_0 + y_n = " << endSum << "\n"
             << "   Non-multiple of 3 sum = " << sumNot3 << " (x 3 = " << 3.0 * sumNot3 << ")\n"
             << "   Multiple of 3 sum = " << sumDiv3 << " (x 2 = " << 2.0 * sumDiv3 << ")\n";
        cout << "3. Main Substitution:\n"
             << "   I = (3 * " << h << " / 8) * [ (" << endSum << ") + (" << 3.0 * sumNot3 << ") + (" << 2.0 * sumDiv3 << ") ]\n"
             << "   I = " << (3.0 * h / 8.0) * (endSum + 3.0 * sumNot3 + 2.0 * sumDiv3) << "\n";
    }

    if (!isArea) {
        cout << "   Volume = pi * I = " << approx << " cubic units\n";
    }
    cout << "4. Final Answer: " << approx << (isArea ? " square units\n" : " cubic units\n");
    if (hasExact) {
        cout << "   Exact Value  : " << exact << " | Absolute Error = " << fabs(approx - exact) << "\n";
    } else if (hasRef) {
        cout << "   Reference Val: " << refVal << " | Absolute Difference = " << fabs(approx - refVal) << "\n";
        cout << "   (Note: Evaluated against reference value, not assumed mathematical truth.)\n";
    } else {
        cout << "   Exact analytical result: Not available — measured data.\n";
    }
    cout << string(52, '-') << "\n";
}

int main() {
    cout << "========================================================\n";
    cout << "        NUMERICAL AREA & VOLUME CALCULATOR (C++)\n";
    cout << "  Trapezoidal Rule | Simpson's 1/3 Rule | Simpson's 3/8\n";
    cout << "========================================================\n";

    vector<Shape> shapes = makeShapes();
    bool keepRunning = true;

    while (keepRunning) {
        // Step 1: Area or Volume
        cout << "\n[1] Select Target Calculation:\n";
        cout << "    1) Area (Integral of f(x) dx)\n";
        cout << "    2) Volume of Solid of Revolution (pi * Integral of [f(x)]^2 dx)\n";
        int targetChoice = readInt("Choice [1]: ", 1);
        if (targetChoice != 1 && targetChoice != 2) {
            cout << "  [!] Select 1 for area or 2 for volume.\n";
            continue;
        }
        bool isArea = (targetChoice == 1);

        // Step 2: Function/Shape or Given Values
        cout << "\n[2] Select Input Mode:\n";
        cout << "    1) Function / Predefined Shape (Default)\n";
        cout << "    2) Given Values (Measured Data)\n";
        int modeChoice = readInt("Choice [1]: ", 1);

        if (modeChoice != 1 && modeChoice != 2) {
            cout << "  [!] Select input mode 1 or 2.\n";
            continue;
        }
        vector<double> ys;
        double h = 0.0;
        int n = 0;
        double exact = 0.0;
        bool hasExact = false;
        bool hasRef = false;
        double refVal = 0.0;
        string problemDesc = "";

        if (modeChoice == 2) {
            // Given Values Mode
            cout << "\nEnter measured y-values (area) or nonnegative radii (volume), separated by commas or spaces:\n";
            cout << "Example: 1.0, 1.25, 1.56, 1.95, 2.44, 3.05, 3.81\n> ";
            string line;
            line = readLine();
            for (char& c : line) {
                if (c == ',') c = ' ';
            }
            stringstream ss(line);
            string token;
            bool invalidData = false;
            while (ss >> token) {
                double value;
                if (!parseNumber(token, value) || (!isArea && value < 0)) {
                    invalidData = true;
                    break;
                }
                ys.push_back(value);
            }
            if (invalidData || ys.size() > 1001) {
                cout << "  [!] Use complete finite numbers, at most 1001 points, and nonnegative radii.\n";
                continue;
            }

            if (ys.size() < 2) {
                cout << "  [!] Error: You must enter at least 2 measured values.\n";
                continue;
            }

            n = static_cast<int>(ys.size()) - 1;
            h = readDouble("Enter step size h (spacing between measurements) [1.0]: ", 1.0);
            if (h <= 0.0) {
                cout << "  [!] Error: Step size h must be strictly positive.\n";
                continue;
            }

            cout << "Enter optional Reference Value (press Enter to skip): ";
            string refStr;
            refStr = readLine();
            if (!refStr.empty()) {
                if (!parseNumber(refStr, refVal)) {
                    cout << "  [!] Reference must be a complete finite number.\n";
                    continue;
                }
                hasRef = true;
            }

            // The volume integrand is r squared; the final integral is scaled by pi.
            if (!isArea) {
                for (double& radius : ys) radius *= radius;
                if (any_of(ys.begin(), ys.end(), [](double y) { return !isfinite(y); })) {
                    cout << "  [!] Squared radii exceed the numerical range.\n";
                    continue;
                }
            }
            hasExact = false;
            problemDesc = "Measured Data (" + to_string(ys.size()) + " points, n = " + to_string(n) + ", h = " + to_string(h) + ")";
        } else {
            // Function / Shape Mode
            cout << "\nAvailable Shapes & Curves:\n";
            for (size_t i = 0; i < shapes.size(); ++i) {
                cout << "    " << setw(2) << i + 1 << ") " << shapes[i].name << "\n";
            }
            int sChoice = readInt("Select shape [6 for Cone]: ", 6);
            if (sChoice < 1 || sChoice > static_cast<int>(shapes.size())) {
                cout << "  [!] Error: Invalid shape selection.\n";
                continue;
            }
            const Shape& S = shapes[sChoice - 1];
            cout << "  --> " << S.name << " (" << S.validRange << ")\n";

            double a = readDouble("Lower limit a [" + to_string(S.defaultA) + "]: ", S.defaultA);
            double b = readDouble("Upper limit b [" + to_string(S.defaultB) + "]: ", S.defaultB);
            if (!(a < b)) {
                cout << "  [!] Error: Lower limit a must be strictly less than upper limit b.\n";
                continue;
            }

            if (!validDomain(sChoice, a, b)) {
                cout << "  [!] Limits are outside the function's valid domain.\n";
                continue;
            }

            n = readInt("Number of intervals n [6]: ", 6);
            if (n < 1 || n > 1000) {
                cout << "  [!] Error: n must be between 1 and 1000.\n";
                continue;
            }

            h = (b - a) / static_cast<double>(n);
            if (!isfinite(h) || h <= 0 || a + h <= a || b - h >= b) {
                cout << "  [!] Limits cannot represent distinct finite sample points.\n";
                continue;
            }
            function<double(double)> g = isArea ? S.f : ([&S](double x) { return S.f(x) * S.f(x); });
            exact = isArea ? (S.F(b) - S.F(a)) : (PI * (S.G(b) - S.G(a)));
            if (!isfinite(exact)) {
                cout << "  [!] Exact value exceeds the numerical range.\n";
                continue;
            }
            hasExact = true;

            bool domainError = false;
            ys.reserve(n + 1);
            for (int i = 0; i <= n; ++i) {
                double x = (i == n) ? b : a + i * h;
                double y = g(x);
                if (isnan(y) || isinf(y)) {
                    cout << "  [!] Error: Function is undefined at x = " << x << ". Check valid domain.\n";
                    domainError = true;
                    break;
                }
                ys.push_back(y);
            }
            if (domainError) continue;

            problemDesc = S.name + " on [" + to_string(a) + ", " + to_string(b) + "] with n = " + to_string(n);
        }

        // Step 3: Select Method
        cout << "\n[3] Select Numerical Integration Method:\n";
        cout << "    1) Trapezoidal Rule (Any n >= 1)\n";
        cout << "    2) Simpson's 1/3 Rule (Requires n even)\n";
        cout << "    3) Simpson's 3/8 Rule (Requires n multiple of 3)\n";
        cout << "    4) Compare All Three Methods\n";
        int methodChoice = readInt("Choice [2]: ", 2);

        if (methodChoice < 1 || methodChoice > 4) {
            cout << "  [!] Select a method from 1 to 4.\n";
            continue;
        }
        double scale = isArea ? 1.0 : PI;
        cout << fixed << setprecision(4);

        if (methodChoice >= 1 && methodChoice <= 3) {
            // Single method calculation
            double approx = numeric_limits<double>::quiet_NaN();
            string methodName = "";

            if (methodChoice == 1) {
                methodName = "Trapezoidal Rule";
                approx = integrateTrapezoidal(ys, h);
            } else if (methodChoice == 2) {
                methodName = "Simpson's 1/3 Rule";
                if (n % 2 != 0) {
                    cout << "\n[!] Error: Simpson's 1/3 Rule requires n to be even. Given n = " << n << " is odd.\n";
                    continue;
                }
                approx = integrateSimpson13(ys, h);
            } else {
                methodName = "Simpson's 3/8 Rule";
                if (n % 3 != 0) {
                    cout << "\n[!] Error: Simpson's 3/8 Rule requires n to be divisible by 3. Given n = " << n << " is not divisible by 3.\n";
                    continue;
                }
                approx = integrateSimpson38(ys, h);
            }

            approx *= scale;
            if (!isfinite(approx)) {
                cout << "  [!] Result exceeds the numerical range.\n";
                continue;
            }

            cout << "\n" << string(52, '=') << "\n";
            cout << "RESULT: " << methodName << "\n";
            cout << "Problem: " << (isArea ? "Area of " : "Volume of ") << problemDesc << "\n";
            cout << "Approximation: " << approx << (isArea ? " square units\n" : " cubic units\n");

            if (hasExact) {
                cout << "Exact Value  : " << exact << (isArea ? " square units\n" : " cubic units\n");
                cout << "Absolute Err : " << fabs(approx - exact) << "\n";
            } else if (hasRef) {
                cout << "Reference Val: " << refVal << " (user reference)\n";
                cout << "Absolute Diff: " << fabs(approx - refVal) << " (difference from reference)\n";
            } else {
                cout << "Exact Result : Not available — measured data\n";
            }
            cout << string(52, '=') << "\n";

            cout << "\nShow step-by-step calculations? (y/n) [y]: ";
            string showStepLine;
            showStepLine = readLine();
            if (showStepLine.empty() || showStepLine[0] == 'y' || showStepLine[0] == 'Y') {
                displaySteps(ys, h, n, methodChoice, approx, isArea, hasExact, exact, hasRef, refVal);
            }

        } else {
            // Comparison table for all 3 methods
            cout << "\n" << string(76, '-') << "\n";
            cout << "  Comparison of Numerical Methods for " << (isArea ? "Area: " : "Volume: ") << problemDesc << "\n";
            cout << string(76, '-') << "\n";
            cout << left << setw(18) << "Method" << setw(16) << "Condition"
                 << right << setw(16) << "Approximation";
            if (hasExact) {
                cout << setw(18) << "Absolute Error\n";
            } else if (hasRef) {
                cout << setw(18) << "Diff (Reference)\n";
            } else {
                cout << setw(26) << "Exact / Reference\n";
            }
            cout << string(76, '-') << "\n";

            // 1. Trapezoidal
            double vTrap = integrateTrapezoidal(ys, h) * scale;
            cout << left << setw(18) << "Trapezoidal" << setw(16) << "Any n >= 1" << right;
            if (isfinite(vTrap)) cout << setw(16) << vTrap;
            else cout << setw(16) << "out of range";
            if (!isfinite(vTrap)) cout << setw(18) << "unavailable";
            else if (hasExact) cout << setw(18) << fabs(vTrap - exact);
            else if (hasRef) cout << setw(18) << fabs(vTrap - refVal);
            else cout << setw(26) << "Not available (measured)";
            cout << "\n";

            // 2. Simpson's 1/3
            double vS13 = integrateSimpson13(ys, h) * scale;
            cout << left << setw(18) << "Simpson's 1/3" << setw(16) << "n must be even" << right;
            if (!isfinite(vS13)) {
                cout << setw(16) << (n % 2 != 0 ? "not valid (odd n)" : "out of range");
                if (hasExact || hasRef) cout << setw(18) << "—";
                else cout << setw(26) << "—";
            } else {
                cout << setw(16) << vS13;
                if (hasExact) cout << setw(18) << fabs(vS13 - exact);
                else if (hasRef) cout << setw(18) << fabs(vS13 - refVal);
                else cout << setw(26) << "Not available (measured)";
            }
            cout << "\n";

            // 3. Simpson's 3/8
            double vS38 = integrateSimpson38(ys, h) * scale;
            cout << left << setw(18) << "Simpson's 3/8" << setw(16) << "n mult of 3" << right;
            if (!isfinite(vS38)) {
                cout << setw(16) << (n % 3 != 0 ? "not valid" : "out of range");
                if (hasExact || hasRef) cout << setw(18) << "—";
                else cout << setw(26) << "—";
            } else {
                cout << setw(16) << vS38;
                if (hasExact) cout << setw(18) << fabs(vS38 - exact);
                else if (hasRef) cout << setw(18) << fabs(vS38 - refVal);
                else cout << setw(26) << "Not available (measured)";
            }
            cout << "\n";

            cout << string(76, '-') << "\n";
            if (hasExact) {
                cout << "Exact analytical value: " << exact << (isArea ? " square units\n" : " cubic units\n");
            } else if (hasRef) {
                cout << "Reference benchmark: " << refVal << " (evaluated against user reference)\n";
            } else {
                cout << "Note: Exact analytical value is not available for discrete measured data.\n";
            }
        }

        // Loop for another calculation
        cout << "\nDo you want to perform another calculation? (y/n) [y]: ";
        string again;
        again = readLine();
        if (!again.empty() && (again[0] == 'n' || again[0] == 'N')) {
            keepRunning = false;
        }
    }

    cout << "\nThank you for using the Numerical Calculator. Goodbye!\n";
    return 0;
}
