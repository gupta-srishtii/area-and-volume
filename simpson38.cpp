// simpson38.cpp
// Implementation of composite Simpson's 3/8 Rule.
// Formula: I = (3h / 8) * [ (y_0 + y_n) + 3 * sum(y_i where i not mult 3) + 2 * sum(y_i where i mult 3) ]
// Condition: n must be a multiple of 3 (n % 3 == 0).

#include "methods.h"
#include <limits>
#include <cmath>

double integrateSimpson38(const std::vector<double>& ys, double h) {
    int n = static_cast<int>(ys.size()) - 1;
    // Simpson's 3/8 requires at least 3 intervals and n must be divisible by 3
    if (n < 3 || n % 3 != 0) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    if (!std::isfinite(h) || h <= 0) return std::numeric_limits<double>::quiet_NaN();
    for (double y : ys) {
        if (!std::isfinite(y)) return std::numeric_limits<double>::quiet_NaN();
    }

    double sum = ys[0] + ys[n];
    for (int i = 1; i < n; ++i) {
        sum += (i % 3 == 0 ? 2.0 : 3.0) * ys[i];
    }

    return (3.0 * h / 8.0) * sum;
}
