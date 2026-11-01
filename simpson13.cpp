// simpson13.cpp
// Implementation of composite Simpson's 1/3 Rule.
// Formula: I = (h / 3) * [ (y_0 + y_n) + 4 * sum(y_odd) + 2 * sum(y_even) ]
// Condition: n must be an even integer (n % 2 == 0).

#include "methods.h"
#include <limits>
#include <cmath>

double integrateSimpson13(const std::vector<double>& ys, double h) {
    int n = static_cast<int>(ys.size()) - 1;
    // Simpson's 1/3 requires at least 2 intervals and n must be even
    if (n < 2 || n % 2 != 0) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    if (!std::isfinite(h) || h <= 0) return std::numeric_limits<double>::quiet_NaN();
    for (double y : ys) {
        if (!std::isfinite(y)) return std::numeric_limits<double>::quiet_NaN();
    }

    double sum = ys[0] + ys[n];
    for (int i = 1; i < n; ++i) {
        sum += (i % 2 == 1 ? 4.0 : 2.0) * ys[i];
    }

    return (h / 3.0) * sum;
}
