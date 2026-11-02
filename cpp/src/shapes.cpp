#include "shapes.h"

#include <algorithm>
#include <limits>

using namespace std;

namespace {
// Safe mathematical bounds to prevent float roundoff NaN
inline double safeSqrt(double x) {
    return sqrt(max(0.0, x));
}

inline double safeAsin(double x) {
    return asin(clamp(x, -1.0, 1.0));
}

} // namespace

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

bool validDomain(int shape, double a, double b) {
    if ((shape == 1 || shape == 2) && (a < -1 || b > 1)) return false;
    if ((shape == 3 || shape == 4) && (a < -2 || b > 2)) return false;
    if ((shape == 10 || shape == 14) && a <= 0) return false;
    if (shape == 15 && a < 0) return false;
    return true;
}
